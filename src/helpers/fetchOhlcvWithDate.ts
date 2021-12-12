import { Exchange, OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";

export async function fetchOhlcvWithDate(exchange: Exchange, symbol: string, timeframe: Timeframe, _startDate: Date, _endDate: Date): Promise<OHLCV[]> {
	const startDate = new Date(_startDate.getTime() - _startDate.getTime() % timeToNumber(timeframe));
	const endDate = new Date(_endDate.getTime() - _endDate.getTime() % timeToNumber(timeframe)); 
	
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