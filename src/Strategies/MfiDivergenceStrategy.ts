import { OHLCV, Exchange } from "ccxt";
import { MFIInput } from "technicalindicators/declarations/volume/MFI";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { Divergence } from "../Technicals/Divergence";
import { MFI } from "../Technicals/MFI";

export class MfiDivergenceStrategy implements IStrategy {
	private overbought: number = 85;
	private oversold: number = 15;
	usesDynamicExit: boolean = false;

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		const mfi: number[] = MFI.calculate(data);
		const {tradeDirection} = Divergence.divergence(data, mfi, this.overbought, this.oversold);
		return tradeDirection;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stop: number; target: number; }> {
		return StopLoss.atr(data, Candlestick.close(data), direction);
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}
}