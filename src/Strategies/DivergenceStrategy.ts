import { OHLCV, Exchange } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { Trend } from "../Consts/Trend";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { RenkoDynamicExit } from "../Orders/RenkoDynamicExit";
import { CandlestickPatterns } from "../Technicals/CandlestickPatterns";
import { Divergence } from "../Technicals/Divergence";
import { KeySRLevels } from "../Technicals/KeySRLevels";
import { MarketTrend } from "../Technicals/MarketTrend";
import { Renko, RenkoBrick } from "../Technicals/Renko";

export class DivergenceStrategy implements IStrategy {
	usesDynamicExit: boolean = true;
	private brickSize: number = -1;
	private stopLossBricks = 8;

	constructor() {}

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		let levels = undefined
		if(symbol && timeframe && exchange) {
			const keySr: KeySRLevels = new KeySRLevels(exchange);
			levels = await keySr.renko(symbol, timeframe, since, limit);
		}
		this.brickSize =  Renko.percentageBricksize(data);
		const {index: divIndex, tradeDirection} = Divergence.rsiRenko(data, this.brickSize);
		const renkoBricks: RenkoBrick[] = Renko.traditional(data, this.brickSize).filter(brick => !brick.ghost);
		const trend: Trend = MarketTrend.renko(data);
		if(tradeDirection == TradeDirection.BUY) {
			// dont countertrade the trend
			if(trend != Trend.DOWN ) {
				if(levels) {
					// check if longing into resistance
					if(levels.current != TradeDirection.SELL && levels.daily != TradeDirection.SELL && Renko.isGreenCandle(renkoBricks, renkoBricks.length-1) 
					&& await CandlestickPatterns.calculate(data) != TradeDirection.SELL) {
						return TradeDirection.BUY;
					}
				} else {
					return TradeDirection.BUY;
				}
			}
		} else if(tradeDirection == TradeDirection.SELL) {
			// dont countertrade the trend
			if(trend != Trend.UP) {
				if(levels) {
					// check for shorting into support
					if(levels.current != TradeDirection.BUY && levels.daily != TradeDirection.BUY && Renko.isRedCandle(renkoBricks, renkoBricks.length-1) 
					&& await CandlestickPatterns.calculate(data) != TradeDirection.BUY) {
						return TradeDirection.SELL;
					}
				} else {
					return TradeDirection.SELL;
				}
			}
		}
		return TradeDirection.HOLD;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
		const entry: number = data[data.length-1][Candlestick.CLOSE];
		let stopLoss: number = -1;
		if(direction == TradeDirection.BUY) {
			stopLoss = entry - (this.stopLossBricks * this.brickSize);
		} else if(direction == TradeDirection.SELL) {
			stopLoss = entry + (this.stopLossBricks * this.brickSize);
		}
        return {stops: [{price: stopLoss, amount: 1}], targets: [{price: -1, amount: 1}]};
	}

	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		const renkoExit: RenkoDynamicExit = new RenkoDynamicExit(exchange, symbol, timeframe, this.brickSize, tradeDirection);
		return renkoExit;
	}
	
}