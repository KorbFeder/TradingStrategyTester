import { OHLCV } from "ccxt";
import { AwesomeOscillator, RSI, MACD } from "technicalindicators";
import { MACDInput } from "technicalindicators/declarations/moving_averages/MACD";
import { AwesomeOscillatorInput } from "technicalindicators/declarations/oscillators/AwesomeOscillator";
import { RSIInput } from "technicalindicators/declarations/oscillators/RSI";
import { TradeDirection } from "../Consts/TradeDirection";
import { Candlestick } from "../Consts/Candlestick";
import { PivotExtremes } from "./PivotExtremes";
import { Renko, RenkoBrick } from "./Renko";
import { SmoothRsi } from "./SmoothRsi";
import { bottomOfCandle, topOfCandle } from "../helper";

const PIVOT_LENGTH = 3;
const RSI_LENGTH = 14;

export class Divergence {
	private static pivotLength: number = PIVOT_LENGTH;
	private static rsiLength: number = RSI_LENGTH;
	private static lookBackCandles: number = PIVOT_LENGTH * 2 + RSI_LENGTH;
	private static overbought: number = 30;
	private static oversold: number = 70;

	public static rsiRenko(data: OHLCV[], brickSize: number) {
		const renkoBricks: RenkoBrick[] = Renko.traditional(data, brickSize);
		const renkoOHLCV: OHLCV[] = renkoBricks.map(brick => [-1, brick.high, brick.high, brick.low, brick.low, -1]);
		const smoothRsi = SmoothRsi.calculate(data.map(data => data[Candlestick.CLOSE]), this.rsiLength);
		return this.divergence(renkoOHLCV, smoothRsi, this.oversold, this.overbought);
	}

	public static rsiBounds(data: OHLCV[]) {
		const smoothRsi = SmoothRsi.calculate(data.map(data => data[Candlestick.CLOSE]), this.rsiLength);
		return this.divergence(data, smoothRsi, this.oversold, this.overbought);
	}

	public static hiddenRsi(data: OHLCV[]) {
		const smoothRsi = SmoothRsi.calculate(data.map(data => data[Candlestick.CLOSE]), this.rsiLength);
		return this.hiddenDivergence(data, smoothRsi, 50, 50);
	}

	public static macd(data: OHLCV[]): {firstIndex: number, secondIndex: number, tradeDirection: TradeDirection} {
		const macdInput: MACDInput = {
			values: data.map((d) => d[Candlestick.CLOSE]),
			fastPeriod: 12,
			slowPeriod: 26,
			signalPeriod: 9 ,
			SimpleMAOscillator: false,
			SimpleMASignal: false
		}

		const macdResult = MACD.calculate(macdInput);
		return this.divergence(data, macdResult.map((macd) => {
			if(macd.MACD) {
				return macd.MACD;
			} else {
				return -1;
			}
		}), 0, 0, macdInput.slowPeriod);
	}

	public static rsi(data: OHLCV[]): {firstIndex: number, secondIndex: number, tradeDirection: TradeDirection} {
		const smoothRsi = SmoothRsi.calculate(data.map(data => data[Candlestick.CLOSE]), this.rsiLength);
		return this.divergence(data, smoothRsi);
	}

	public static ao(_data: OHLCV[]): {index: number, tradeDirection: TradeDirection} {
		const renkoBricks = Renko.traditional(_data, _data[_data.length-1][Candlestick.CLOSE]);
		const aoInput: AwesomeOscillatorInput = {
			high: renkoBricks.map(brick => brick.high),
			low: renkoBricks.map(brick => brick.low),
			fastPeriod: 5,
			slowPeriod: 34
		}
		const osc: number[] = AwesomeOscillator.calculate(aoInput);
		const data: OHLCV[] = renkoBricks.map(brick => [-1, brick.low, brick.high, brick.low, brick.high, -1]);

		const startOsc = osc.length - this.lookBackCandles < 0 ? 0 : osc.length - this.lookBackCandles;
		const startData = data.length - this.lookBackCandles < 0 ? 0 : data.length - this.lookBackCandles;

		const endOfOsc: number[] = osc.slice(startOsc, osc.length);
		const endOfData: OHLCV[] = data.slice(startData, data.length);
		const {highs, lows} = PivotExtremes.oscAsBoolArray(osc, this.pivotLength, 0);
		
		const startHigh = highs.length - this.lookBackCandles < 0 ? 0 : highs.length - this.lookBackCandles;
		const startLow = lows.length - this.lookBackCandles < 0 ? 0 : lows.length - this.lookBackCandles;

		const highPivots = highs.slice(startHigh, highs.length);
		const lowPivots = lows.slice(startLow, lows.length);

		for(let i = endOfData.length - 1; i >= endOfData.length - 1 - Math.floor(1.8 * this.pivotLength); i--) {
			if(highPivots[i]) {
				// search for next high
				for(let u = i - 1; u >= this.pivotLength; u--) {
					if(highPivots[u]) {
						// since ao is a lagging indicator find the corrsponding highs to the left
						const firstHigh = PivotExtremes.leftHigh(endOfData, u);
						const secHigh = PivotExtremes.leftHigh(endOfData, i);
						const difference = endOfOsc[u] / endOfOsc[i] - 1;
						if(secHigh.high > firstHigh.high && difference > 0.02 && endOfOsc[endOfOsc.length-1] > 0) {
							return {index: data.length - 1 - (this.lookBackCandles - i), tradeDirection: TradeDirection.SELL};
						} 
					}
				}
			}

			if(lowPivots[i]) {
				// search for next low
				for(let u = i - 1; u >= this.pivotLength; u--) {
					if(lowPivots[u]) {
						// since ao is a lagging indicator find the corrsponding lows to the left
						const firstLow = PivotExtremes.leftLow(endOfData, u);
						const secLow = PivotExtremes.leftLow(endOfData, i);
						const difference =  endOfOsc[u] / endOfOsc[i] - 1;
						if(secLow.low < firstLow.low && difference > 0.02 && endOfOsc[endOfOsc.length-1] < 0) {
							return {index: data.length - 1 - (this.lookBackCandles - i), tradeDirection: TradeDirection.BUY};
						} 
					}
				}
			}
		}
		return {index: 0, tradeDirection: TradeDirection.HOLD};
	}

	public static hiddenDivergence(data: OHLCV[], osc: number[], oscMax: number = 0, oscMin: number = 0, length = 14) {
		const lookBackCandles = PIVOT_LENGTH * 2 + length;
		const endOfOsc: number[] = osc.slice(osc.length - lookBackCandles, osc.length);
		const endOfData: OHLCV[] = data.slice(data.length - lookBackCandles, data.length);
		const {highs, lows } = PivotExtremes.oscAsBoolArray(osc, this.pivotLength);		
		const highPivots = highs.slice(highs.length - lookBackCandles, highs.length);
		const lowPivots = lows.slice(lows.length - lookBackCandles, lows.length);

		for(let i = endOfData.length - 1; i >= 17; i--) {
			if(highPivots[i]) {
				// search for next high
				let maxRsiRange = i - length;
				if(maxRsiRange < 0) {
					maxRsiRange = 0;
				}
				for(let u = i - 1; u >= maxRsiRange; u--) {
					if(highPivots[u]) {
						if(endOfData[i][Candlestick.CLOSE] < endOfData[u][Candlestick.CLOSE] && endOfOsc[i] > endOfOsc[u]) {
							if(oscMax < endOfOsc[u]) {
								return {index: data.length - 1 - (lookBackCandles - i), tradeDirection: TradeDirection.SELL};
							}
						}
					}
				}
			}

			if(lowPivots[i]) {
				// search for next low
				let maxRsiRange = i - length;
				if(maxRsiRange < 0) {
					maxRsiRange = 0;
				}
				for(let u = i - 1; u >= maxRsiRange; u--) {
					if(lowPivots[u]) {
						if(endOfData[i][Candlestick.CLOSE] > endOfData[u][Candlestick.CLOSE] && endOfOsc[i] < endOfOsc[u]) {
							if(oscMin > endOfOsc[u]) {
								return {index: data.length - 1 - (lookBackCandles - i), tradeDirection: TradeDirection.BUY};
							}
						}
					}
				}
			}
		}
		return {index: 0, tradeDirection: TradeDirection.HOLD};
	
	}

	public static divergence(data: OHLCV[], osc: number[], oscMax: number = 0, oscMin: number = 0, length: number = 14): {firstIndex: number, secondIndex: number, tradeDirection: TradeDirection} {
		const lookBackCandles = PIVOT_LENGTH * 2 + length;
		const endOfOsc: number[] = osc.slice(osc.length - lookBackCandles, osc.length);
		const endOfData: OHLCV[] = data.slice(data.length - lookBackCandles, data.length);
		const {highs, lows } = PivotExtremes.oscAsBoolArray(osc, this.pivotLength);		
		const highPivots = highs.slice(highs.length - lookBackCandles, highs.length);
		const lowPivots = lows.slice(lows.length - lookBackCandles, lows.length);

		// confirmation candle lookback
		const i = lookBackCandles - PIVOT_LENGTH - 1;
		if(highPivots[i]) {
			// search for next high
			let maxLength = i - length;
			if(maxLength < 0) {
				maxLength = 0;
			}
			for(let u = i - 1; u >= maxLength; u--) {
				if(highPivots[u]) {
					if(topOfCandle(endOfData[i]) > topOfCandle(endOfData[u]) && endOfOsc[i] < endOfOsc[u]) {
						// oscillator line has to be under the osc level and oscillator line shouldnt be below the last pivot point
						if(oscMax < endOfOsc[u] && endOfOsc[i] > endOfOsc[endOfOsc.length-1]) {
							return {firstIndex: data.length - (lookBackCandles - u), secondIndex: data.length - (lookBackCandles - i), tradeDirection: TradeDirection.SELL};
						}
					} 
				}
			}
		}

		if(lowPivots[i]) {
			// search for next low
			let maxRsiRange = i - length;
			if(maxRsiRange < 0) {
				maxRsiRange = 0;
			}
			for(let u = i - 1; u >= maxRsiRange; u--) {
				if(lowPivots[u]) {
					if(bottomOfCandle(endOfData[i]) < bottomOfCandle(endOfData[u]) && endOfOsc[i] > endOfOsc[u]) {
						// oscillator line has to be under the osc level and oscillator line shouldnt be above the last pivot point
						if(oscMin > endOfOsc[u] && endOfOsc[i] < endOfOsc[endOfOsc.length-1]) {
							return {firstIndex: data.length - (lookBackCandles - u), secondIndex: data.length - (lookBackCandles - i), tradeDirection: TradeDirection.BUY};
						}
					}
				}
			}
		}
		return {firstIndex: 0, secondIndex: 0, tradeDirection: TradeDirection.HOLD};
	}
}