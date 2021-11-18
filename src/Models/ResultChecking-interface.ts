import { OHLCV } from "ccxt";
import { TradeDirection } from "../Consts/TradeDirection";
import { BacktestConfig } from "../Testing/Backtesting";
import { FuturePosition } from "./FuturePosition-interface";
import { ManagePosition } from "./ManagePosition-interface";
import { ITrade } from "./TestAccount-model";

export interface IResultChecking {
	currPosition: FuturePosition | undefined;
	managePosition: ManagePosition;
	check(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig): Promise<ITrade[] | undefined>;
}