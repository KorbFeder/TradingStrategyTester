import { Exchange, OHLCV } from "ccxt";
import { TradeDirection } from "../Consts/TradeDirection";
import { Trend } from "../Consts/Trend";
import { IStrategy } from "../Models/Strategy-interface";
import { MacdStrategy } from "./MacdStrategy";
import { MarketTrend } from "../Technicals/MarketTrend";
import { StopLoss } from "../Orders/StopLoss";
import { Timeframe } from "../Consts/Timeframe";
import { IDynamicExit } from "../Models/DynamicExit-interface";

export class SimpleMomentumStrategy implements IStrategy {
    direction: TradeDirection = TradeDirection.HOLD;
    usesDynamicExit: boolean = false;

    constructor(private exchange: Exchange){}

    async calculate(data: OHLCV[], optional: any): Promise<TradeDirection> {
        const macdStrat = new MacdStrategy(this.exchange);
        const macd = await macdStrat.calculate(data);
        const marketTrend = new MarketTrend();
        const trend: Trend = await marketTrend.tripleSMA(data);
        if(macd == TradeDirection.BUY && trend == Trend.UP) {
            return TradeDirection.BUY;
        } 
        if(macd == TradeDirection.SELL && trend == Trend.DOWN) {
            return TradeDirection.SELL;
        }
        return TradeDirection.HOLD;
    }

    async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stop: number; target: number; }> {
        return StopLoss.atr(data, data[data.length-1][4], direction)
    }

	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
        return undefined;
    }
}