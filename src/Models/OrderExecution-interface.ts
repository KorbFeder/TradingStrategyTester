import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDataProvider } from "./DataProvider-interface";
import { FuturePosition, LimitOrder } from "./FuturePosition-interface";
import { ITrade } from "./TestAccount-model";

export interface IOrderExecution {
	createPosition(position: FuturePosition): Promise<void>;
	closePosition(symbol: string, exitPrice: number): Promise<void>;
	getPosition(symbol: string): Promise<FuturePosition | undefined>;
	getTrades(symbol: string): Promise<ITrade[]>;
	// checks on the position, and reacts if there was an error
	checkPosition(dataProvider: IDataProvider, symbol: string, timeframe: Timeframe): Promise<void>;
	getBalance(): Promise<number>;
}