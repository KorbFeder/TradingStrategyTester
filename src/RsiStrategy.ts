import { binance, OHLCV } from "ccxt";
import { RSI } from "technicalindicators";
import { RSIInput } from "technicalindicators/declarations/oscillators/RSI";
import { Strategy } from "./strategy-interface";
import { Timeframe } from "./Timeframe";
import { TradePressure } from "./TradePressure";

const RSI_LENGTH = 14;
const RSI_SELL = 70;
const RSI_BUY = 30;

// relative strength index
export class RsiStrategy implements Strategy{
    private rsiValue: number = -1;

    constructor(
        public exchange: binance,
        public symbol: string,
        private timeframe: Timeframe
    ) {}

    private sma(src: number[]): number {
        console.log(src);
        let sum = 0;
        for(let i = 0; i < RSI_LENGTH; i++) {
            sum = sum + src[i] / RSI_LENGTH;
        }
        console.log(sum);
        return sum;
    }

    private rma(src: number, lastRma: number | undefined = undefined): number {
        if(lastRma == undefined) {
            lastRma = 0;
        } else {
            lastRma = ((lastRma * (RSI_LENGTH - 1)) + src) / RSI_LENGTH;
        }
        return lastRma;
    }

    rsi(data: OHLCV[]): number {
        const rsiInput: RSIInput =  {
            values: data.slice(data.length - RSI_LENGTH - 1, data.length).map((ohlcv: OHLCV) => ohlcv[4]),
            period: RSI_LENGTH
        };
        // todo -> maybe use rsi calculated with RMA or WEMA
        const rsis = RSI.calculate(rsiInput);
        this.rsiValue = rsis[rsis.length-1];

        return this.rsiValue;
    }

    rsiWithRma(data: OHLCV[]): number[] {
        // todo -> fix code
        const values: number[] = data.slice(data.length - RSI_LENGTH - 1, data.length).map((ohlcv: OHLCV) => ohlcv[4]);
        let lastRma: number = 0;
        let rsi: number[] = [];
        for(let i = 0; i < values.length - 1; i++) {
            const up: number = Math.max(values[i] - values[i + 1], 0);
            const down: number = Math.max(values[i+ 1] - values[i], 0);
            const rs: number = this.rma(up, lastRma) / this.rma(down, lastRma);
            const res: number = 100 - 100 / (1 + rs);
            rsi.push(res);
            lastRma = res;
        }
        return rsi;
    }

    getRsiValue(): number {
        if (this.rsiValue == -1) {
            throw "rsi wasnt calculated yet";
        }
        return this.rsiValue;
    }

    async tradeIndicator(): Promise<TradePressure> {
        const ohlcvs: OHLCV[] = await this.exchange.fetchOHLCV (this.symbol, this.timeframe);
        const rsi = await this.rsi(ohlcvs);
        console.log(rsi);

        if (rsi > RSI_SELL) {
            return TradePressure.SELL;
        } else if (rsi < RSI_BUY) {
            return TradePressure.BUY;
        } else {
            return TradePressure.HOLD;
        }
    }

}