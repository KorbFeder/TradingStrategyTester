import { Exchange, OHLCV, Trade } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { IDataProvider } from "../Models/DataProvider-interface";

export class LiveDataProvider implements IDataProvider {
	constructor(private exchange: Exchange) {}

	getOhlcv(symbol: string, timeframe: Timeframe): Promise<OHLCV[]> {
		return this.exchange.fetchOHLCV(symbol, timeframe);
	}
	getTrades(symbol: string): Promise<Trade[]> {
		throw new Error("Method not implemented.");
	}
	getFunding(symbol: string): Promise<number[]> {
		throw new Error("Method not implemented.");
	}
	getOi(symbol: string): Promise<number[]> {
		throw new Error("Method not implemented.");
	}
}