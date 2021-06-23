import { OHLCV } from "ccxt";
import { bearish, bullish } from "technicalindicators";
import StockData from "technicalindicators/declarations/StockData";
import { TradeDirection } from "../Consts/TradeDirection";

export class CandlestickPatterns {
    public static async calculate(data: OHLCV[], optional?: any): Promise<TradeDirection> {
        const candleInput: StockData = {
            open: data.map((d) => d[1]),
            high: data.map((d) => d[2]),
            close: data.map((d) => d[4]),
            low: data.map((d) => d[3])
        }
        if(bullish(candleInput) == true) {
            return TradeDirection.BUY;
        }
        if(bearish(candleInput) == true) {
            return TradeDirection.SELL;
        }
        return TradeDirection.HOLD;
    }
}