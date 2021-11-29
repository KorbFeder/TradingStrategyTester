import { OHLCV } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { ChartData } from "./ChartData-model";
import { IDataProvider } from "./DataProvider-interface";
import { FuturePosition } from "./FuturePosition-interface";
import { ManagePosition } from "./ManagePosition-interface";
import { IStrategy } from "./Strategy-interface";
import { ITrade } from "./TestAccount-model";

export interface IResultChecking {
	currPosition: FuturePosition | undefined;
	managePosition: ManagePosition;
	check(dataProvider: IDataProvider, direction: TradeDirection, symbol: string, timeframe: Timeframe, strategy: IStrategy): Promise<ITrade[] | undefined>;
}