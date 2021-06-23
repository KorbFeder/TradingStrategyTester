import { Exchange, OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
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

    constructor(private exchange: Exchange, private symbol: string) {}

    private calculateRenko(ohlcv: OHLCV[], renkoBricksize: number): {highs: number[], lows: number[]} {
        const renko = Renko.traditional(ohlcv, renkoBricksize);
        return this.getPivot(renko);
    }

    async renko(timeframe: Timeframe): Promise<{daily: {aboveLevel: number, belowLevel: number}, current: {aboveLevel: number, belowLevel: number}}> {
        const fourhOHLCV: OHLCV[] = await this.exchange.fetchOHLCV(this.symbol, Timeframe.h4);
        const dailyOHLCV: OHLCV[] = await this.exchange.fetchOHLCV(this.symbol, Timeframe.d1);
        const currentOHLCV: OHLCV[] = await this.exchange.fetchOHLCV(this.symbol, timeframe);
        this.renkoBricksize = Renko.percentageBricksize(dailyOHLCV); 

        const fourPivots = this.calculateRenko(fourhOHLCV, this.renkoBricksize);
        const dailyPivots = this.calculateRenko(dailyOHLCV, this.renkoBricksize * 5);
        const currentRenko = Renko.traditional(currentOHLCV, this.renkoBricksize);
 
        const srLevels: SRLevel[] = this.renkoConsolidation(currentRenko);

        const dailyLevels: SRLevel[] = this.allPivotsToSr(dailyPivots.highs, dailyPivots.lows);
        const fourhLevels: SRLevel[] = this.allPivotsToSr(fourPivots.highs, fourPivots.lows);

        const sortedCurrentLevels = srLevels.sort((a, b)=> b.strength - a.strength);
        const filterLength = (sortedCurrentLevels.length-1) * (this.filterPercentage);
        const strongestCurrentLevels = sortedCurrentLevels.slice(0, filterLength);

        const level = dailyLevels.sort((a, b) => a.price-b.price);
        const nextDailyLevels = this.nextLevel(dailyLevels, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE]);
        const nextStrongestLevels = this.nextLevel(strongestCurrentLevels, currentOHLCV[currentOHLCV.length-1][Candlestick.CLOSE]);
        return {daily: nextDailyLevels, current: nextStrongestLevels};
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

    private nextLevel(srLevels: SRLevel[], currentPrice: number): {aboveLevel: number, belowLevel: number} {
        const sorted = srLevels.sort((a,b) => b.price-a.price);
        for(let i = 1; i < sorted.length-1; i++) {
            if(sorted[i-1].price >= currentPrice && sorted[i].price <= currentPrice) {
                return {aboveLevel: sorted[i-1].price, belowLevel: sorted[i].price};
            }
        }
        return {aboveLevel: -1, belowLevel: -1};
    }
}