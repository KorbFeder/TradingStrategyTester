import { OHLCV } from "ccxt";
import { sum } from "lodash";
import { Candlestick } from "../Consts/Candlestick";
import { change } from "../helper";

export class MFI {
	static calculate(data: OHLCV[], length: number = 14): number[] {
		if(data.length < length) {
			throw 'data need to be longer than length';
		}
		const src: number[] = Candlestick.hlc3_all(data);
		const changeUpper: number[] = Array<number>(data.length).fill(0);
		const changeLower: number[] = Array<number>(data.length).fill(0);
		for(let i = 1; i < data.length; i++) {
			changeUpper[i] = Candlestick.volumn(data, i) * (change(src, i) <= 0 ? 0 : src[i]);
			changeLower[i] = Candlestick.volumn(data, i) * (change(src, i) >= 0 ? 0 : src[i]);
		}
		const mfi: number[] = Array<number>(data.length).fill(0);
		for(let i = length; i < data.length; i++) {
			const _changeUpper = changeUpper.slice(i + 1 - length, i + 1);
			const _changeLower = changeLower.slice(i + 1 - length, i + 1);
			const upper = sum(_changeUpper);
			const lower = sum(_changeLower);
			mfi[i] = 100 - (100 / (1 + upper / lower));
		}
		return mfi;
	}
}