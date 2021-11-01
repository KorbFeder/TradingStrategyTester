import { OHLCV } from "ccxt";
import { adx, EMA, SMA } from "technicalindicators";
import { Candlestick } from "../Consts/Candlestick";
import { change, trueRange } from "../helper";
import { ADX } from "./ADX";
import { ATR } from "./ATR";
import { RMA } from "./RMA";

export class TrendType {
	public static calculate(data: OHLCV[]): number[] {
		const atrLen = 14;
		const atrMaLen = 20;

		const adxLen = 14;
		const adxLim = 25;

		const smooth = 3;

		const atr: number[] = ATR.calculate(data, atrLen);
		const diff = data.length - atr.length;
		for(let i = 0; i < diff; i++) {
			atr.unshift(atr[0]);
		}
		const atrMa: number[] = EMA.calculate({period: atrMaLen, values: atr})
		const diffMa = data.length - atrMa.length;
		for(let i = 0; i < diffMa; i++) {
			atrMa.unshift(atrMa[0]);
		}
		const adxResult: {adx: number, plus: number, minus: number}[] = ADX.calculate(data, adxLen);

		const atrSideways: boolean[] = atr.map((a, i) => a <= atrMa[i]);
		const adxSideways: boolean[] = adxResult.map((a) => a.adx <= adxLim);
		const sideways: boolean[] = adxSideways.map((adx, i) => adx || atrSideways[i]);

		const upTrend: boolean[] = adxResult.map((adx) => adx.plus > adx.minus);
		const downTrend: boolean[] = adxResult.map((adx) => adx.minus > adx.plus);

		const trendType: number[] = sideways.map((side, i) => side ? 0 : upTrend[i] ? 2 : -2);
		const smaType = SMA.calculate({period: smooth, values: trendType})
		const smoothType = smaType.map((sma) => Math.round(sma / 2));

		return smoothType;
	}
}