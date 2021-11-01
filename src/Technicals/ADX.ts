import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { change, trueRange } from "../helper";
import { RMA } from "./RMA";

export class ADX {
	public static calculate(data: OHLCV[], length: number): {adx: number, plus: number, minus: number}[] {
		const trur: number[] = RMA.calculate(trueRange(data), length);                           
		for(let i = 0; i < length - 1; i++) {
			trur.unshift(trur[0]);
		}
		const up: number[] = data.map((_, i) => change(Candlestick.high_all(data), i));
		const down: number[] = data.map((_, i) => -change(Candlestick.low_all(data), i));
		const plusDM: number[] = Array<number>(data.length);
		const minusDM: number[] = Array<number>(data.length);
		
		for(let i = data.length-1; i > 1; i--) {
			plusDM[i] = (up[i] > down[i] && up[i] > 0 ? up[i] : 0);
			minusDM[i] = (down[i] > up[i] && down[i] > 0 ? down[i] : 0);
		}
		const plusRma = RMA.calculate(plusDM, length);
		for(let i = 0; i < length - 1; i++) {
			plusRma.unshift(plusRma[0]);
		}
		const minusRma = RMA.calculate(minusDM, length);
		for(let i = 0; i < length - 1; i++) {
			minusRma.unshift(minusRma[0]);
		}
		const plus = plusRma.map((rma, i) =>  100 * rma / trur[i]);
		const minus = minusRma.map((rma, i) => 100 * rma / trur[i]);
		const sum = plus.map((p, i) => p + minus[i]);                         

		const adx = RMA.calculate(plus.map((p, i) => 100 *  (Math.abs(p - minus[i]) / (sum[i] == 0 ? 1 : sum[i]))), length);
		for(let i = 0; i < length - 1; i++) {
			adx.unshift(adx[0]);
		}
		return adx.map((adx, i) => {return {adx: adx, minus: minus[i], plus: plus[i]}});
	}
}