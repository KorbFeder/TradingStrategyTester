import { Exchange, OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";

export async function fetchWithDate(exchange: Exchange, symbol: string, timeframe: Timeframe, startDate: Date, endDate: Date): Promise<OHLCV[]> {
	if(startDate.getTime() >= endDate.getTime()) {
		throw 'startTime (' + startDate + ') should not be bigger or equal than endTime (' + endDate + ')';
	}
	if(endDate.getTime() >= Date.now()) {
		throw 'end Date is in the future:' + endDate ;
	}
	let startingDate = startDate.getTime();
	let data: OHLCV[] = []
	while(true) {
		const d = await exchange.fetchOHLCV(symbol, timeframe, startingDate);
		startingDate = Candlestick.timestamp(d);
		if(data.length > 0 && Candlestick.timestamp(d, 0) == Candlestick.timestamp(data)) {
			data.pop();
		}
		data = data
			.concat(d)
			.filter((_d) => _d[Candlestick.TIMESTAMP] <= endDate.getTime());
		if(Candlestick.timestamp(data) >= endDate.getTime()) {
			break;
		} 
	}
	return data;
}