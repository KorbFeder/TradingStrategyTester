import { OHLCV, Exchange } from "ccxt";
import { MACD, renko } from "technicalindicators";
import { macd, MACDInput } from "technicalindicators/declarations/moving_averages/MACD";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { Trend } from "../Consts/Trend";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { KeySRLevels } from "../Technicals/KeySRLevels";
import { MarketTrend } from "../Technicals/MarketTrend";
import { Renko, RenkoBrick } from "../Technicals/Renko";
import { MacdStrategy } from "./MacdStrategy";

export class SRStrategy implements IStrategy {
	usesDynamicExit: boolean = false;
	private macdFastLength = 12;
    private macdSlowLength = 26;
    private macdSignalSmoothing = 9;
   

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe): Promise<TradeDirection> {
		if(exchange && symbol && timeframe) {
			const renkoBricks: RenkoBrick[] = Renko.traditional(data, Renko.percentageBricksize(data));
			const keySr: KeySRLevels = new KeySRLevels(exchange);
			const levels = await keySr.renko(symbol, timeframe);

			const trend: Trend = MarketTrend.renko(data);

			const macdStrat = new MacdStrategy();
			const macdRes = await macdStrat.calculate(data);

			if(trend == Trend.UP && (levels.current == TradeDirection.BUY || levels.daily == TradeDirection.BUY)) {
				return TradeDirection.BUY
			} else if(trend == Trend.DOWN && (levels.current == TradeDirection.SELL || levels.daily == TradeDirection.SELL)) {
				return TradeDirection.SELL
			}
		}
		return TradeDirection.HOLD;
	}
	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
		throw new Error("Method not implemented.");
	}
	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}
	
}