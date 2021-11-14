import { OHLCV, Exchange } from "ccxt";
import { waitForDebugger } from "inspector";
import { random } from "lodash";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";

export class ExitTestStrategy implements IStrategy {
	private counter = 0;

	constructor(public usesDynamicExit: boolean, private waitBarsToEnter: number,private minBarsForIndicator: number = 20) {
		this.counter = minBarsForIndicator;
	}

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		this.counter++;
		if(this.counter >= this.waitBarsToEnter) {
			this.counter = 0;
			return Math.random() > 0.5 ? TradeDirection.BUY : TradeDirection.SELL;
		}
		return TradeDirection.HOLD;
	}

	getStopLossTarget(data: OHLCV[], entryPrice: number, direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
		throw new Error("Method not implemented.");
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}
	
}