import { OHLCV } from "ccxt";
import { EMA, SMA } from "technicalindicators";
import { Candlestick } from "../Consts/Candlestick";

export class WaveTrend {
	// Channel Length
	static n1 = 10;
	// Avarage Length
	static n2 = 21;


	static obLevel1 = 60; 
	static obLevel2 = 53; 
	static osLevel1 = -60;
	static osLevel2 = -53;


	static calculate(data: OHLCV[]) {
		const ap = Candlestick.hlc3_all(data) 
		const esa = EMA.calculate({period: this.n1, values: ap});
		const d = EMA.calculate({period: this.n1, values: esa.map((e, i) => Math.abs(ap[i] - e))});
		const ci = esa.map((e, i) => (ap[i] - e) / (0.015 * d[i]));

		const tci = EMA.calculate({period: this.n2, values: ci});
		const wt2 = SMA.calculate({period: 4, values: tci});
		
		return {green: tci, red: wt2, blue: tci.map((t, i) => t-wt2[i])}
	}

}