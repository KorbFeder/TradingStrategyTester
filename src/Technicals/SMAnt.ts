import { OHLCV } from "ccxt";
import { result } from "lodash";
import { Candlestick } from "../Consts/Candlestick";

// implementation of Simple Moving Avarage from Ninjatrader
export class SMAnt {
	static calculate(data: number[], length: number): number[] {
		const input = data[0];
		const results = [];
		let sum = 0;
		let priorSum = 0;
		for(let i = 0; i < data.length; i++) {
			priorSum = sum;
			const secVal = (i >= length ? data[i - length] : 0);
			const firstVal = data[i];
			sum = priorSum + firstVal - secVal;
			results.push(sum / (i < length ? i + 1 : length));
		}
		return [results[results.length-1]];
	}
}