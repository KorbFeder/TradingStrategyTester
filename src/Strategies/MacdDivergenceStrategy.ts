import { OHLCV, Exchange } from "ccxt";
import { MACD } from "technicalindicators";
import { MACDInput, MACDOutput } from "technicalindicators/declarations/moving_averages/MACD";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { Divergence } from "../Technicals/Divergence";

export class MacdDivergenceStrategy implements IStrategy {
	usesDynamicExit: boolean = false;

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		const div = Divergence.macd(data);
		return div.tradeDirection;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stop: number; target: number; }> {
		return StopLoss.atr(data, Candlestick.close(data), direction);
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}
	
}