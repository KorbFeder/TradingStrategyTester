import { OHLCV, Exchange } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { Trend } from "../Consts/Trend";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";

export class DivergenceTrendStrategy implements IStrategy {
	usesDynamicExit: boolean = false;

	constructor(
		private trendStrategy: (data: OHLCV[]) => Trend,
		private divStrategy: IStrategy
	) {}

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		const trend = this.trendStrategy(data);
		if(trend != Trend.SIDE) {
			return await this.divStrategy.calculate(data, exchange, symbol, timeframe, since, limit);
		}
		return TradeDirection.HOLD; 
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
		return StopLoss.atr(data, Candlestick.close(data), direction);
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}
}