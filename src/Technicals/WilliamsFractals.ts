import { OHLCV } from "ccxt"
import { Candlestick } from "../Consts/Candlestick"

export class WilliamsFractals {
	static calculate(data: OHLCV[], length: number = 2) {
		const fractials: {upFractal: boolean, downFractal: boolean}[] = Array(data.length).fill({upFractal: false, downFractal: false});
		for(let i = data.length - 1 - length; i >= length; i--) {
			const bearishFractal = data[i][Candlestick.HIGH] > data[i-2][Candlestick.HIGH] && 
				data[i][Candlestick.HIGH] > data[i-1][Candlestick.HIGH] && 
				data[i][Candlestick.HIGH] > data[i+1][Candlestick.HIGH] && 
				data[i][Candlestick.HIGH] > data[i+2][Candlestick.HIGH];

			const bullishFractial = data[i][Candlestick.LOW] < data[i-2][Candlestick.LOW] && 
				data[i][Candlestick.LOW] < data[i-1][Candlestick.LOW] && 
				data[i][Candlestick.LOW] < data[i+1][Candlestick.LOW] && 
				data[i][Candlestick.LOW] < data[i+2][Candlestick.LOW];

			fractials[i] = {upFractal: bearishFractal, downFractal: bullishFractial};
		}

		return fractials;
	}
}