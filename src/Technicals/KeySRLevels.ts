import { Exchange, OHLCV } from "ccxt";
import { SMA } from "technicalindicators";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { Trend } from "../Consts/Trend";
import { PivotExtremes } from "./PivotExtremes";
import { Renko, RenkoBrick } from "./Renko";

interface SRLevel {
    price: number;
    touches: number;
    strength: number;
}

export class KeySRLevels {
    private pivotLength = 40;
    private renkoBricksize = 0;
    private filterPercentage = 0.15;
    private srDistance = 1;

    constructor(private exchange: Exchange) {}

    private calculateRenko(ohlcv: OHLCV[], renkoBricksize: number): {highs: number[], lows: number[]} {
        const renko = Renko.traditional(ohlcv, renkoBricksize);
        return this.getPivot(renko);
    }

    async renko(symbol: string, timeframe: Timeframe, since?: number, limit?: number): Promise<{daily: TradeDirection, current: TradeDirection}> {
        //const fourhOHLCV: OHLCV[] = await this.exchange.fetchOHLCV(symbol, Timeframe.h4);
        const dailyOHLCV: OHLCV[] = await this.exchange.fetchOHLCV(symbol, Timeframe.d1, since, limit);
        const currentOHLCV: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframe, since, limit);
        this.renkoBricksize = Renko.percentageBricksize(dailyOHLCV); 

        //const fourPivots = this.calculateRenko(fourhOHLCV, this.renkoBricksize);
        const dailyPivots = this.calculateRenko(dailyOHLCV, this.renkoBricksize * 5);
        const currentRenko = Renko.traditional(currentOHLCV, this.renkoBricksize);
 
        const srLevels: SRLevel[] = this.renkoConsolidation(currentRenko);

        const dailyLevels: SRLevel[] = this.allPivotsToSr(dailyPivots.highs, dailyPivots.lows);
        //const fourhLevels: SRLevel[] = this.allPivotsToSr(fourPivots.highs, fourPivots.lows);

        const sortedCurrentLevels = srLevels.sort((a, b)=> b.strength - a.strength);
        const filterLength = (sortedCurrentLevels.length-1) * (this.filterPercentage);
        const strongestCurrentLevels = sortedCurrentLevels.slice(0, filterLength);

        const level = dailyLevels.sort((a, b) => a.price-b.price);
        const nextDailyLevels = this.nextLevel(level, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE]);
        const nextStrongestLevels = this.nextLevel(strongestCurrentLevels, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE]);
		const dailyDirection = this.checkCloseLevel(nextDailyLevels, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE], dailyOHLCV);
        const strongDirection = this.checkCloseLevel(nextStrongestLevels, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE], currentOHLCV);
        return {daily: dailyDirection, current: strongDirection};
    }

    async renkoWithData(dailyOHLCV: OHLCV[], currentOHLCV: OHLCV[]) {
        //const fourhOHLCV: OHLCV[] = await this.exchange.fetchOHLCV(symbol, Timeframe.h4);
        this.renkoBricksize = Renko.percentageBricksize(dailyOHLCV); 

        //const fourPivots = this.calculateRenko(fourhOHLCV, this.renkoBricksize);
        const dailyPivots = this.calculateRenko(dailyOHLCV, this.renkoBricksize * 5);
        const currentRenko = Renko.traditional(currentOHLCV, this.renkoBricksize);
 
        const srLevels: SRLevel[] = this.renkoConsolidation(currentRenko);

        const dailyLevels: SRLevel[] = this.allPivotsToSr(dailyPivots.highs, dailyPivots.lows);
        //const fourhLevels: SRLevel[] = this.allPivotsToSr(fourPivots.highs, fourPivots.lows);

        const sortedCurrentLevels = srLevels.sort((a, b)=> b.strength - a.strength);
        const filterLength = (sortedCurrentLevels.length-1) * (this.filterPercentage);
        const strongestCurrentLevels = sortedCurrentLevels.slice(0, filterLength);

        const level = dailyLevels.sort((a, b) => a.price-b.price);
        const nextDailyLevels = this.nextLevel(level, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE]);
        const nextStrongestLevels = this.nextLevel(strongestCurrentLevels, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE]);
		const dailyDirection = this.checkCloseLevel(nextDailyLevels, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE], dailyOHLCV);
        const strongDirection = this.checkCloseLevel(nextStrongestLevels, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE], currentOHLCV);
        return {daily: dailyDirection, current: strongDirection};
    }


    private getPivot(renkoBricks: RenkoBrick[]): {highs: number[], lows: number[]} {
        const highValues: number[] = [];
        const lowValues: number[] = [];
        
        const {highs} = PivotExtremes.oscAsBoolArray(renkoBricks.map(four => four.high), this.pivotLength);
        const {lows} = PivotExtremes.oscAsBoolArray(renkoBricks.map(four => four.low), this.pivotLength);

        for(let i = 0; i < renkoBricks.length - 1; i++) {
            if(highs[i] && !renkoBricks[i].ghost) {
                highValues.push(renkoBricks[i].high);
            }
        }

        for(let i = 0; i < renkoBricks.length - 1; i++) {
            if(lows[i] && !renkoBricks[i].ghost) {
                lowValues.push(renkoBricks[i].low);
            }
        }

        return {highs: highValues, lows: lowValues}
    }

    private renkoConsolidation(renkoBricks: RenkoBrick[]): SRLevel[] {
        const srLevels: SRLevel[] = []
        for(let i = renkoBricks.length-2; i > 0; i--) {
            if(this.microHigh(renkoBricks, i)) {
                this.addSRLevel(srLevels, renkoBricks[i].high);
            } 

            if(this.microLow(renkoBricks, i)) {
                this.addSRLevel(srLevels, renkoBricks[i].low);
            }
        }
        return srLevels;
    }

    private microHigh(renkoBricks: RenkoBrick[], index: number): boolean {
        if(index + 1 < renkoBricks.length && index - 1 >= 0) {
            if(renkoBricks[index+1].high == renkoBricks[index].low && renkoBricks[index-1].high == renkoBricks[index].low) {
                return true
            }
        }
        return false
    }

    private microLow(renkoBricks: RenkoBrick[], index: number): boolean {
         if(index + 1 < renkoBricks.length && index - 1 >= 0) {
            if(renkoBricks[index+1].low == renkoBricks[index].high && renkoBricks[index-1].low == renkoBricks[index].high) {
                return true
            }
        }
        return false
    }

    private addSRLevel(srLevels: SRLevel[], level: number) {
        let index = 0;
        const old = srLevels.filter((sr, _index) => { 
            index = _index;
            return sr.price == level;
        });
        if(old.length > 0) {
            srLevels[index].strength++;
        } else {
            srLevels.push({price: level, touches: 0, strength: 1});
        }
    }

    private allPivotsToSr(highs: number[], lows: number[]) {
        const srLevels: SRLevel[] = [];
        for(let high of highs) {
            this.addSRLevel(srLevels, high);
        }
        for(let low of lows) {
            this.addSRLevel(srLevels, low);
        }
        return srLevels;
    }

    private nextLevel(srLevels: SRLevel[], currentPrice: number): {aboveLevel: SRLevel, belowLevel: SRLevel} {
        const sorted = srLevels.sort((a,b) => b.price-a.price);
        for(let i = 1; i < sorted.length-1; i++) {
            if(sorted[i-1].price >= currentPrice && sorted[i].price <= currentPrice) {
                return {aboveLevel: sorted[i-1], belowLevel: sorted[i]};
            }
        }
        return {aboveLevel: {price: -1, touches: -1, strength: -1}, belowLevel: {price: -1, touches: -1, strength: -1}};
    }

    private isCloseToLevel(level: SRLevel, currentPrice: number, isAbove: boolean): boolean {
        if(isAbove && level.price <= currentPrice + this.renkoBricksize * this.srDistance) {
            return true;
        }
        if(!isAbove && level.price >= currentPrice - this.renkoBricksize * this.srDistance) {
            return true;
        }
        return false;
    }

    private checkCloseLevel(level: {aboveLevel: SRLevel, belowLevel: SRLevel}, currentPrice: number, data: OHLCV[]): TradeDirection {
        // ma to check from direction the check came
        const maInput: MAInput = {
            period: 10,
            values: data.map(d => d[Candlestick.CLOSE]) 
        }
        const ma = SMA.calculate(maInput);
    
        if(this.isCloseToLevel(level.aboveLevel, currentPrice, true) && ma[ma.length-1] <= level.aboveLevel.price) {
            // above
            return TradeDirection.SELL;
        } else if(this.isCloseToLevel(level.belowLevel, currentPrice, false) && ma[ma.length-1] >= level.belowLevel.price) {
            // below
            return TradeDirection.BUY;
        }
        return TradeDirection.HOLD;
    }
}