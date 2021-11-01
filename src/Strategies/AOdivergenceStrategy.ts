import { Exchange, OHLCV } from "ccxt";
import { RSI } from "technicalindicators";
import { RSIInput } from "technicalindicators/declarations/oscillators/RSI";
import { TradeDirection } from "../Consts/TradeDirection";
import { Candlestick } from "../Consts/Candlestick";
import { IStrategy } from "../Models/Strategy-interface";
import { Divergence } from "../Technicals/Divergence";
import { Renko } from "../Technicals/Renko";
import { StopLoss } from "../Orders/StopLoss";
import { Timeframe } from "../Consts/Timeframe";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";

export class AOdivergenceStrategy implements IStrategy {
	usesDynamicExit: boolean = false;
	
	async calculate(data: OHLCV[], optional?: any): Promise<TradeDirection> {
		const renkoBricks = Renko.traditional(data, data[data.length-1][Candlestick.CLOSE] * 0.001).map(d => (d.high + d.low)/2);
		const rsiInput: RSIInput = {
			period: 14,
			values: renkoBricks
		}
		const rsiValues = RSI.calculate(rsiInput);
		const div = Divergence.ao(data);
		if(rsiValues[rsiValues.length-1] > 50 && div.tradeDirection == TradeDirection.BUY) {
			return TradeDirection.BUY;
		} else if(rsiValues[rsiValues.length-1] < 50 && div.tradeDirection == TradeDirection.SELL) {
			return TradeDirection.SELL;
		}
		return TradeDirection.HOLD;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
        return StopLoss.atr(data, data[data.length-1][Candlestick.CLOSE], direction);
	}

	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		return undefined;
	}
}