import { OHLCV, Exchange } from "ccxt";
import { waitForDebugger } from "inspector";
import { random } from "lodash";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { ChartData } from "../Models/ChartData-model";
import { IDataProvider } from "../Models/DataProvider-interface";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { OptimizationParameters } from "./Optimizing";

export class ExitTestStrategy implements IStrategy {
	private counter = 0;

	constructor(
		public symbol: string,
		public timeframe: Timeframe,
		private waitBarsToEnter: number,
		public barsNeededForIndicator: number= 20
	) {
		this.counter = barsNeededForIndicator;
	}

	getDefaultParams(): number[] {
		throw new Error("Method not implemented.");
	}


	async calculate(dataProvider: IDataProvider): Promise<TradeDirection> {
		this.counter++;
		if(this.counter >= this.waitBarsToEnter) {
			this.counter = 0;
			return Math.random() > 0.5 ? TradeDirection.BUY : TradeDirection.SELL;
		}
		return TradeDirection.HOLD;
	}

	getStopLoss(dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection): Promise<LimitOrder[]> {
		throw new Error("Method not implemented.");
	}
	getTarget(dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection): Promise<LimitOrder[]> {
		throw new Error("Method not implemented.");
	}
	checkExit(dataProvider: IDataProvider, tradeDirection: TradeDirection): Promise<boolean> {
		throw new Error("Method not implemented.");
	}
	getParams(): OptimizationParameters[] {
		throw new Error("Method not implemented.");
	}
	setParams(value: number[]): void {
		throw new Error("Method not implemented.");
	}
}