import { OHLCV } from "ccxt";

export interface IScreener {
	find(data: OHLCV[]): Promise<boolean>;
}