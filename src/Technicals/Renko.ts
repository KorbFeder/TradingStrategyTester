import { OHLCV } from "ccxt";
import { ATR } from "technicalindicators";
import { ATRInput } from "technicalindicators/declarations/directionalmovement/ATR";
import { Candlestick } from "../Consts/Candlestick";

export interface RenkoBrick {
	high: number;
	low: number;
	ghost: boolean;
}

export class Renko {
	public static atr(data: OHLCV[], period: number): RenkoBrick[] {
		const atrInput: ATRInput = {
			low: data.map(d => d[Candlestick.LOW]),
			high: data.map(d => d[Candlestick.HIGH]),
			close: data.map(d => d[Candlestick.CLOSE]),
			period
		};
		const atr = ATR.calculate(atrInput);
		return this.calc(data, atr[atr.length-1]);
	}

	public static traditional(data: OHLCV[], brickSize: number): RenkoBrick[] {
		return this.calc(data, brickSize);
	}

	public static percentageBricksize(data: OHLCV[]): number {
		let percent: number = 0.001
		if(process.env.RENKO_BRICK_PERCENT) {
			percent = parseFloat(process.env.RENKO_BRICK_PERCENT);
		}
		return percent * data[data.length-1][Candlestick.CLOSE];
	}

	private static calc(data: OHLCV[], brickSize: number): RenkoBrick[] {
		const renkoBricks: RenkoBrick[] = [];

		// first fake candle normed to brickSize
		const firstValue = Math.floor(data[0][Candlestick.CLOSE] / brickSize) * brickSize;
		renkoBricks.push({high: firstValue, low: firstValue, ghost: false});

		for(let u = 1; u < data.length; u++) {
			// the last candle is a ghost candle && needs to be marked as one
			let ghost = false;
			if(u == data.length - 1) {
				ghost = true;
			}
			while(data[u][Candlestick.CLOSE] - renkoBricks[renkoBricks.length-1].high > brickSize) {
				renkoBricks.push({high: renkoBricks[renkoBricks.length-1].high + brickSize, low: renkoBricks[renkoBricks.length-1].high, ghost});
			}
			while(renkoBricks[renkoBricks.length-1].low - data[u][Candlestick.CLOSE] > brickSize) {
				renkoBricks.push({high: renkoBricks[renkoBricks.length-1].low, low: renkoBricks[renkoBricks.length-1].low - brickSize, ghost});
			}
		}

		// add ghost brick that is too small for beeing printed 
		if(data[data.length - 1][Candlestick.CLOSE] - renkoBricks[renkoBricks.length-1].high >= 0) {
			renkoBricks.push({high: data[data.length - 1][Candlestick.CLOSE], low: renkoBricks[renkoBricks.length-1].high, ghost: true});
		} else if(renkoBricks[renkoBricks.length-1].low - data[data.length-1][Candlestick.CLOSE] >= 0) {
			renkoBricks.push({high: renkoBricks[renkoBricks.length-1].low, low: data[data.length-1][Candlestick.CLOSE], ghost: true});
		}

		// remove fake brick 
		return renkoBricks.slice(1, renkoBricks.length);
	}

	public static isRedCandle(renkoBricks: RenkoBrick[], index: number): boolean {
		if(index <= 0) {
			return false;
		}
		if(renkoBricks[index-1].low == renkoBricks[index].high) {
			return true;
		}
		return false;	
	}

	public static isGreenCandle(renkoBricks: RenkoBrick[], index: number): boolean {
		if(index <= 0) {
			return false;
		}
		if(renkoBricks[index-1].high == renkoBricks[index].low) {
			return true;
		}
		return false;
	}
}