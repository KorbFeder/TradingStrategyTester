import { Exchange, OHLCV } from "ccxt";
import { RSI } from "technicalindicators";
import { RSIInput } from "technicalindicators/declarations/oscillators/RSI";
import { IStrategy } from "../Models/Strategy-interface";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { defaultStopLossTarget } from "../helper";

// relative strength index
export class RsiStrategy implements IStrategy {
    private rsiValue: number = -1;
    public winrate: number = 1;

    // parameters for backpropagation
    private RSI_LENGTH = 14;
    private RSI_SELL = 70;
    private RSI_BUY = 30;

    constructor(
        public exchange: Exchange,
        private timeframe: Timeframe
    ) {}

    rsi(data: OHLCV[]): number {
        const rsiInput: RSIInput =  {
            values: data.slice(data.length - this.RSI_LENGTH - 1, data.length).map((ohlcv: OHLCV) => ohlcv[4]),
            period: this.RSI_LENGTH
        };
        // todo -> maybe use rsi calculated with RMA or WEMA
        const rsis = RSI.calculate(rsiInput);
        this.rsiValue = rsis[rsis.length-1];

        return this.rsiValue;
    }

    // function to get the actual value that was calculated with the rsi function
    getConfidenceValue(): number {
        if (this.rsiValue == -1) {
            throw "rsi wasnt calculated yet";
        }
        return this.rsiValue / 100;
    }

    async calculate(symbol: string): Promise<TradeDirection> {
        const ohlcvs: OHLCV[] = await this.exchange.fetchOHLCV (symbol, this.timeframe);
        const rsi = await this.rsi(ohlcvs);

        if (rsi > this.RSI_SELL) {
            return TradeDirection.SELL;
        } else if (rsi < this.RSI_BUY) {
            return TradeDirection.BUY;
        } else {
            return TradeDirection.HOLD;
        }
    }

    backpropagation(successful: boolean) {
        if (!successful) {
            // do smth
        }
    }

    async getStopLossTarget(symbol: string): Promise<{ stop: number; target: number; }> {
        return await defaultStopLossTarget(this.exchange, symbol, this.timeframe)
    }
}