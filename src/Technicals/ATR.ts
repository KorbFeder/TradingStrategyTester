import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { RMA } from "./RMA";

export class ATR {
	static calculate(data: OHLCV[], length: number = 14): number[] {
		const trueRange: number[] = data.map(d => d[Candlestick.HIGH] - d[Candlestick.LOW]);
		//true range can be also calculated with tr(true)
		return RMA.calculate(trueRange, length);
	}

	// ninjatrader Version of ATR
	static calcNt(data: OHLCV[], length: number = 14): number[] {
		const high0	= Candlestick.high(data, 0);
		const low0 = Candlestick.low(data, 0);

		const result: number[] = [];
		result.push(high0-low0);
		for(let i = 1; i < data.length-1; i++) {
			const high0	= Candlestick.high(data, i);
			const low0 = Candlestick.low(data, i);
			const close1 = Candlestick.close(data, i-1);
			const trueRange = Math.max(Math.abs(low0 - close1), Math.max(high0 - low0, Math.abs(high0 - close1)));
			const first = (Math.min(i+1, length)-1) * result[result.length-1] + trueRange;
			const second = Math.min(i+1, length);
			result.push(first / second);
		}
		return result;
	}
}