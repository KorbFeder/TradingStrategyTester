import { OHLCV, Trade } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";

export interface IDataProvider {
	getOhlcv(symbol: string, timeframe: Timeframe): Promise<OHLCV[]>;
	getTrades(symbol: string): Promise<Trade[]>;
	getFunding(symbol: string): Promise<number[]>;
	getOi(symbol: string): Promise<number[]>;
}