import { Exchange, OHLCV, Trade } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { fetchOhlcvWithDate } from "../helpers/fetchOhlcvWithDate";
import { HistoricTradesFetcher} from "../Models/HistoricTradesFetcher-interface";

// saves the latest data to provide it faster
export class DataCache {
	private trades: {trades: Trade[], startDate: Date, endDate: Date} | undefined = undefined;
	private ohlcv: {ohlcv: OHLCV[], startDate: Date, endDate: Date} | undefined = undefined;;

	constructor(private exchange: Exchange, private dataProvider?: HistoricTradesFetcher) {
	}

	async getOhlcv(symbol: string, timeframe: Timeframe, startDate: Date, endDate: Date): Promise<OHLCV[]> {
		//if(this.ohlcv && this.ohlcv.startDate == startDate && this.ohlcv.endDate == endDate) {
		if(this.ohlcv && this.ohlcv.startDate.getTime() == startDate.getTime() && this.ohlcv.endDate.getTime() == endDate.getTime()) {
			return this.ohlcv.ohlcv;
		} else {
			const data = await fetchOhlcvWithDate(this.exchange, symbol, timeframe, startDate, endDate);
			this.ohlcv = {ohlcv: data, startDate, endDate};
			return data;
		}
	}

	public async getTrades(symbol: string, startDate: Date, endDate: Date): Promise<Trade[] | undefined> {
		if(this.dataProvider) {
			if(this.trades && this.trades.startDate == startDate && this.trades.endDate == endDate) {
				return this.trades.trades;
			} else {
				let trades: Trade[] = [];
				let currDate = startDate;
				currDate.setHours(0, 0, 0, 0);
				for(; currDate <= endDate; currDate.setDate(currDate.getDate() + 1)) {
					const newTrades = await this.dataProvider.getData(symbol, currDate);
					trades = newTrades.concat(trades);
				}
				this.trades = {trades: trades, startDate, endDate};
				return trades;
			}
		}
	}

	public async cleanCache() {
		this.trades = undefined;
		this.ohlcv = undefined;
	}
}