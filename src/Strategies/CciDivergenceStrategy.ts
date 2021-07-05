import { OHLCV, Exchange } from "ccxt";
import { CCI } from "technicalindicators";
import { CCIInput } from "technicalindicators/declarations/oscillators/CCI";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { Divergence } from "../Technicals/Divergence";

export class CciDivergenceStrategy implements IStrategy {
	usesDynamicExit: boolean = false;

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		const cciInput: CCIInput = {
			high: Candlestick.high_all(data),
			low: Candlestick.low_all(data),
			close: Candlestick.close_all(data),
			period: 20
		};
		const cciRes: number[] = CCI.calculate(cciInput);
		const div = Divergence.divergence(data, cciRes, 100, -100, 20);	
		return div.tradeDirection;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stop: number; target: number; }> {
		return StopLoss.atr(data, Candlestick.close(data), direction);
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}

}