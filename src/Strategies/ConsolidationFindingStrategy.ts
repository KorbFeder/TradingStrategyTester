import { OHLCV, Exchange } from "ccxt";
import { CandleData } from "technicalindicators";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { highest, lowest } from "../helper";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { ChoppinessIndex } from "../Technicals/ChoppinessIndex";

export class ConsolidationFindingStrategy implements IStrategy {
	usesDynamicExit: boolean = false;

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		const liqudationMoveCiValue = 20;
		const ci: number[] = ChoppinessIndex.calculate(data);
		let liqIndex: number = ci.length;
		let consolidationIndex: number = ci.length;
		let foundRange: boolean = false;

		// find last liquidation move
		for(let i = ci.length-1; i >= 0; i--) {
			if(ci[i] <= liqudationMoveCiValue) {
				liqIndex = i;
				break;
			}
		}

		// find the consolidation that came after the liquidation move
		for(let i = liqIndex; i < ci.length; i++) {
			if(ci[i] > 61.8) {
				consolidationIndex = i;
				foundRange = true;
				break;
			}
		}
		const lengthDiff = data.length - ci.length;

		const searchRange: OHLCV[] = data.slice(liqIndex + lengthDiff + 1, consolidationIndex + lengthDiff);
		const rangeHigh = highest(Candlestick.high_all(searchRange));
		const rangeLow = lowest(Candlestick.low_all(searchRange));
		const midRange = (rangeHigh + rangeLow) / 2;

		if(foundRange) {
			// close back into the range
			if(Candlestick.close(data, data.length-2) > rangeHigh && Candlestick.close(data) < rangeHigh || 
				Candlestick.high(data, data.length-2) > rangeHigh && Candlestick.close(data) < rangeHigh
			) {
				const {stops} = StopLoss.atr(data, Candlestick.close(data), TradeDirection.SELL);
				// check if positive R:R
				if(Math.abs(stops[0].price - Candlestick.close(data)) < Math.abs(midRange - Candlestick.close(data))) {
					return TradeDirection.SELL;
				}
			}
			if(Candlestick.close(data, data.length-2) < rangeLow && Candlestick.close(data) > rangeLow ||
				Candlestick.low(data, data.length-2) < rangeLow && Candlestick.close(data) > rangeLow
			) {
				const {stops} = StopLoss.atr(data, Candlestick.close(data), TradeDirection.BUY);
				if(Math.abs(stops[0].price - Candlestick.close(data)) < Math.abs(midRange - Candlestick.close(data))) {
					return TradeDirection.BUY;
				}
			}
		}
		
		return TradeDirection.HOLD;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
		const liqudationMoveCiValue = 20;
		const ci: number[] = ChoppinessIndex.calculate(data);
		let liqIndex: number = data.length-1;
		let consolidationIndex: number = data.length-1;

		// find last liquidation move
		for(let i = ci.length-1; i >= 0; i--) {
			if(ci[i] <= liqudationMoveCiValue) {
				liqIndex = i;
			}
		}

		// find the consolidation that came after the liquidation move
		for(let i = liqIndex; i < data.length; i++) {
			if(ci[i] > 61.8) {
				consolidationIndex = i;
			}
		}

		const searchRange: OHLCV[] = data.slice(liqIndex, consolidationIndex);
		const rangeHigh = highest(Candlestick.high_all(searchRange));
		const rangeLow = lowest(Candlestick.low_all(searchRange));
		const midRange = (rangeHigh + rangeLow) / 2;

		const {stops} = StopLoss.atr(data, Candlestick.close(data), direction);
		const targets: LimitOrder[] = [{price: midRange, amount: 0.7}, {price: direction == TradeDirection.BUY ? rangeHigh : rangeLow, amount: 0.3}];
		
		return {stops, targets};
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}
	
}