import { OHLCV, Exchange } from "ccxt";
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

export class RsiDivergenceStrategy implements IStrategy {
	usesDynamicExit: boolean = false;

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		// todo -> use dynamic exit, but sell @ rsi hitting 50 level with: confirmation? with some perecent over the line?
		
		const trend = MarketTrend.superGuppy(data);
		const {tradeDirection, index} = Divergence.rsiBounds(data);
		if(tradeDirection == TradeDirection.BUY && trend == Trend.DOWN) {
			return TradeDirection.HOLD;
		} else if(tradeDirection == TradeDirection.SELL && trend == Trend.UP) {
			return TradeDirection.HOLD;
		}
		if(tradeDirection != TradeDirection.HOLD) {
			console.log('test');
		}
		return tradeDirection;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
		return StopLoss.atr(data, Candlestick.close(data), direction);
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}
	
}