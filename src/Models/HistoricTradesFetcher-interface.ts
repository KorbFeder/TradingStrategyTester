import { Trade } from "ccxt";

export interface HistoricTradesFetcher {
	name: string;
	getData(symbol: string, currDate: Date): Promise<Trade[]>;
}