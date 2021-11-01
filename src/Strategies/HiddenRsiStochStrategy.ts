import { OHLCV, Exchange } from "ccxt";
import { EMA } from "technicalindicators";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { Trend } from "../Consts/Trend";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { Divergence } from "../Technicals/Divergence";
import { MarketTrend } from "../Technicals/MarketTrend";

export class HiddenRsiStochStrategy implements IStrategy{
	usesDynamicExit: boolean = false;
	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		const trend = MarketTrend.ema(data);
		const {tradeDirection} = Divergence.hiddenRsi(data);
		if(trend == Trend.UP) {
			// longs only
			if(tradeDirection == TradeDirection.BUY) {
				return tradeDirection;
			}
		} else if(trend == Trend.DOWN) {
			// shorts only
			if(tradeDirection == TradeDirection.SELL) {
				return tradeDirection;
			}
		}
		return tradeDirection;
	}
	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
        return StopLoss.atr(data, Candlestick.close(data), direction)
	}
	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}

}