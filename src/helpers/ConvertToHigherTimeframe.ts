import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";

export class ConvertToHigherTimeframe {
	static convert(data: OHLCV[], originTf: Timeframe, targetTf: Timeframe): OHLCV[] {

		const originTime: number = timeToNumber(originTf);
		const targetTime: number = timeToNumber(targetTf);
		const perCandle: number = targetTime / originTime;

		const higherTfOhlcv: OHLCV[] = [];
		let open = Candlestick.open(data, 0);
		let volume = 0;
		let high = Number.MIN_VALUE;
		let low = Number.MAX_VALUE;
		let timestamp = Candlestick.timestamp(data, 0);
		for(let i = 0; i < data.length; i++) {
			if(Candlestick.timestamp(data, i) % targetTime == 0) {
				// only push if there has been enough candles for they to merge into a big one
				if(i >= perCandle) {
					higherTfOhlcv.push([timestamp, open, high, low, Candlestick.close(data, i - 1), volume])
				}
				volume = 0;
				high = Candlestick.high(data, i);
				low = Candlestick.low(data, i);
		
				open = Candlestick.open(data, i);
				timestamp = Candlestick.timestamp(data, i);
			}

			if(Candlestick.high(data, i) > high) {
				high = Candlestick.high(data, i);
			}
			if(Candlestick.low(data, i) < low) {
				low = Candlestick.low(data, i);
			}

			volume += Candlestick.volumn(data, i);
		}
		return higherTfOhlcv;
	}
}