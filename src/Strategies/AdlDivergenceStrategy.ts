import { OHLCV, Exchange } from "ccxt";
import { ADL } from "technicalindicators";
import { ADLInput } from "technicalindicators/declarations/volume/ADL";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { Divergence } from "../Technicals/Divergence";

export class AdlDivergenceStrategy implements IStrategy {
	usesDynamicExit: boolean = false;

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		const adlInput: ADLInput = {
			high: Candlestick.high_all(data),
			low: Candlestick.low_all(data),
			close: Candlestick.close_all(data),
			volume: Candlestick.volumn_all(data)
		};
		const adl: number[] = ADL.calculate(adlInput);
		const div = Divergence.divergence(data, adl);
		return div.tradeDirection;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
		return StopLoss.atr(data, Candlestick.close(data), direction);
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}
}