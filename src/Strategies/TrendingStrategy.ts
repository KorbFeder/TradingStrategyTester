import * as ccxt from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { MovingAvarageStrategy } from "./MovingAvarageStrategy";
import { TradeDirection } from "../Consts/TradeDirection";
import { IStrategy } from "../Models/Strategy-interface";

export enum Trends {
    DOWNTREND, UPTREND, CONSOLIDATION 
} 

const MaLength = 20;
const MaOffset = 20;

export class TrendingStrategy implements IStrategy {
    private Trending: Trends = Trends.CONSOLIDATION;
    public winrate: number = 1;

    constructor(
        public exchange: ccxt.Exchange, 
        private timeframe: Timeframe
    ) {}

    getStopLossTarget(symbol: string): Promise<{ stop: number; target: number; }> | { stop: number; target: number; } {
        throw new Error("Method not implemented.");
    }

    getConfidenceValue(): number {
        throw new Error("Method not implemented.");
    }

    async getTrend(symbol: string): Promise<Trends> {
        const ohlcvs: ccxt.OHLCV[] = await this.exchange.fetchOHLCV (symbol, this.timeframe);
        const current = MovingAvarageStrategy.MovingAverage(ohlcvs, MaLength);
        const middle = MovingAvarageStrategy.MovingAverage(ohlcvs, MaLength, MaOffset/2);
        const past = MovingAvarageStrategy.MovingAverage(ohlcvs, MaLength, MaOffset);
        const diff = Math.abs(current - past);
        // todo -> add classification for consolidation
        if (current > past) {
            this.Trending = Trends.UPTREND;
        } else {
            this.Trending = Trends.DOWNTREND;
        }
        return this.Trending;
    }

    async findHighestHigh(symbol: string): Promise<number> {
        const ohlcvs: ccxt.OHLCV[] = await this.exchange.fetchOHLCV (symbol, this.timeframe);
        return ohlcvs.map((ohlcv: ccxt.OHLCV) => ohlcv[2]).reduce((high, curr) => high > curr ? high : curr);
    }

    async findLowestLow(symbol: string): Promise<number> {
        const ohlcvs: ccxt.OHLCV[] = await this.exchange.fetchOHLCV (symbol, this.timeframe);
        return ohlcvs.map((ohlcv: ccxt.OHLCV) => ohlcv[3]).reduce((low, curr) => low < curr ? low : curr);
    }

    calculate(symbol: string): Promise<TradeDirection> {
        throw new Error("Method not implemented.");
    }

    backpropagation(successful: boolean) {

    }
}