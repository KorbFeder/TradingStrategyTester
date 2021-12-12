import { Exchange, OHLCV, Trade } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";
import { fetchOhlcvWithDate } from "../helpers/fetchOhlcvWithDate";
import { IDataProvider } from "../Models/DataProvider-interface";

export class HistoricDataProvider implements IDataProvider {
	private ohlcv: OHLCV[] = [];
	private startDate: Date | undefined = undefined;
	private endDate: Date | undefined = undefined;
	private currDate: Date | undefined = undefined;
	private timeframe: Timeframe | undefined;


	constructor(
		public exchange: Exchange,
	) {
	}

	async getOhlcv(symbol: string, timeframe: Timeframe): Promise<OHLCV[]> {
		if(this.startDate && this.endDate && this.currDate) {
			if(this.ohlcv.length <= 0 || !(Candlestick.timestamp(this.ohlcv) == this.endDate.getTime() && Candlestick.timestamp(this.ohlcv, 0) == this.startDate.getTime() && this.timeframe == timeframe)) {
				this.ohlcv = await fetchOhlcvWithDate(this.exchange, symbol, timeframe, this.startDate, this.endDate);
				this.timeframe = timeframe
			}
			const index: number = Math.floor(this.currDate.getTime() - this.startDate.getTime()) / timeToNumber(timeframe); 
			const data = this.ohlcv.slice(0, index + 1);

			return data
		}
		return [];
	}

	async getTrades(symbol: string): Promise<Trade[]> {
		throw new Error("Method not implemented.");
	}
	getFunding(symbol: string): Promise<number[]> {
		throw new Error("Method not implemented.");
	}

	getOi(symbol: string): Promise<number[]> {
		throw new Error("Method not implemented.");
	}
	
	getConfimationData(timeframe: Timeframe): OHLCV[] {
		if(this.startDate && this.endDate && this.currDate) {
			if(this.ohlcv.length <= 0) {
				return [];
			}
			const index: number = Math.floor(this.currDate.getTime() - this.startDate.getTime()) / timeToNumber(timeframe); 
			return this.ohlcv.slice(index, this.ohlcv.length);
		}
		return [];
	}

	setStartEndDate(startDate: Date, endDate: Date) {
		this.startDate = startDate;
		this.endDate = endDate;
	}

	setCurrDate(currDate: Date) {
		this.currDate = currDate;
	}
}