import { OHLCV, Exchange } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { highest, lowest } from "../helper";
import { ATR } from "./ATR";

export class ChoppinessIndex {
	static calculate(data: OHLCV[]): number[] {
		const length = 14;
		const ci_all: number[] = [];
		for(let i = 0; i < data.length-1-length; i++) {
			const lastCandles: OHLCV[] = data.slice(data.length - length - i, data.length - i);
			const atr: number[] = ATR.calculate(lastCandles, 1);
			const atrSum = atr.reduce((a,b) => a + b, 0);
			const range = (highest(Candlestick.high_all(lastCandles)) - lowest(Candlestick.low_all(lastCandles)));
			const a = atrSum / range;
			const ci = 100 * Math.log10(a)/ Math.log10(length);
			ci_all.push(ci);
		}
		return ci_all.reverse();
	}
	
}