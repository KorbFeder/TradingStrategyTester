import { OHLCV } from "ccxt"
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { SMA } from "technicalindicators";
import { Candlestick } from "../Consts/Candlestick";
import { RMA } from "./RMA";
import { change } from "../helper";

// Smoothed Rsi, used in TradingView
export class SmoothRsi {
	

	public static calculate(data: number[], length: number): number[] {
		const upChange: number[] = [];
		const downChange: number[] = [];
		const rsi: number[] = [];

		for(let i = length; i < data.length; i++) {
			upChange.push(Math.max(change(data, i), 0));	
			downChange.push(-Math.min(change(data, i), 0));	
		}

		const up = RMA.calculate(upChange, length);
		const down = RMA.calculate(downChange, length);

		for(let i = 0; i < up.length; i++) {
			rsi.push(down[i] == 0 ? 100 : up[i] == 0 ? 0 : 100 - (100 / (1 + up[i] / down[i])));
		}
		return rsi;
	}
}