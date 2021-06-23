import { OHLCV } from "ccxt"
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { SMA } from "technicalindicators";
import { Candlestick } from "../Consts/Candlestick";

// Smoothed Rsi, used in TradingView
export class SmoothRsi {
	private static rma(data: number[], length: number): number[] {
		const alpha: number = 1 / length; 

		const smaInput: MAInput = {
			period: length, 
			values: data.map((d) => d)
		}
		const sma = SMA.calculate(smaInput);
		const sum: number[] = [sma[length-1]];

		for(let i = length - 1; i < data.length; i++) {
			sum.push(alpha * data[i] + (1 - alpha) * sum[sum.length-1]);
		}
		return sum;
	}

	public static calculate(data: number[], length: number): number[] {
		const upChange: number[] = [];
		const downChange: number[] = [];
		const rsi: number[] = [];

		for(let i = length; i < data.length; i++) {
			upChange.push(Math.max(this.change(data, i), 0));	
			downChange.push(-Math.min(this.change(data, i), 0));	
		}

		const up = this.rma(upChange, length);
		const down = this.rma(downChange, length);

		for(let i = 0; i < up.length; i++) {
			rsi.push(down[i] == 0 ? 100 : up[i] == 0 ? 0 : 100 - (100 / (1 + up[i] / down[i])));
		}
		return rsi;
	}

	private static change(data: number[], i: number): number {
		if(i - 1 < 0) {
			throw 'i would be negative for array in change function of rsi';
		}
		return data[i] - data[i-1];
	}
}