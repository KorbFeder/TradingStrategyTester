import { OHLCV } from "ccxt";
import { AwesomeOscillator, RSI, MACD } from "technicalindicators";
import { MACDInput } from "technicalindicators/declarations/moving_averages/MACD";
import { AwesomeOscillatorInput } from "technicalindicators/declarations/oscillators/AwesomeOscillator";
import { RSIInput } from "technicalindicators/declarations/oscillators/RSI";
import { TradeDirection } from "../Consts/TradeDirection";
import { Candlestick } from "../Consts/Candlestick";
import { PivotExtremes } from "./PivotExtremes";
import { Renko, RenkoBrick } from "./Renko";

const PIVOT_LENGTH = 4;
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
		const rsiInput: RSIInput = {
			period: this.rsiLength,
			values: renkoBricks.map(brick => (brick.high + brick.low) / 2)
		};
		const rsiResult: number[] = RSI.calculate(rsiInput);
		return this.divergence(renkoOHLCV, rsiResult, this.oversold, this.overbought);

	}

	public static rsiBounds(data: OHLCV[]) {
		const rsiInput: RSIInput = {
			period: this.rsiLength,
			values: data.map((d) => d[Candlestick.CLOSE])
		};
		const rsiResult: number[] = RSI.calculate(rsiInput);
		return this.divergence(data, rsiResult, this.oversold, this.overbought);
	}

	public static macd(data: OHLCV[]): {index: number, tradeDirection: TradeDirection} {
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
		}));
	}

	public static rsi(data: OHLCV[]): {index: number, tradeDirection: TradeDirection} {
		const rsiInput: RSIInput = {
			period: this.rsiLength,
			values: data.map((d) => d[Candlestick.CLOSE])
		};
		const rsiResult: number[] = RSI.calculate(rsiInput);
		return this.divergence(data, rsiResult);
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

	private static divergence(data: OHLCV[], osc: number[], oscMax: number = 0, oscMin: number = 0): {index: number, tradeDirection: TradeDirection} {
		const endOfOsc: number[] = osc.slice(osc.length - this.lookBackCandles, osc.length);
		const endOfData: OHLCV[] = data.slice(data.length - this.lookBackCandles, data.length);
		const {highs, lows } = PivotExtremes.oscAsBoolArray(osc, this.pivotLength);		
		const highPivots = highs.slice(highs.length - this.lookBackCandles, highs.length);
		const lowPivots = lows.slice(lows.length - this.lookBackCandles, lows.length);

		for(let i = endOfData.length - 1; i >= 0; i--) {
			if(highPivots[i]) {
				// search for next high
				for(let u = i - 1; u >= 0; u--) {
					if(highPivots[u]) {
						if(endOfData[i][Candlestick.HIGH] > endOfData[u][Candlestick.HIGH] && endOfOsc[i] < endOfOsc[u]) {
							if(oscMax < endOfOsc[u]) {
								return {index: data.length - 1 - (this.lookBackCandles - i), tradeDirection: TradeDirection.SELL};
							}
						}
					}

				}
			}

			if(lowPivots[i]) {
				// search for next low
				for(let u = i - 1; u >= 0; u--) {
					if(lowPivots[u]) {
						if(endOfData[i][Candlestick.LOW] < endOfData[u][Candlestick.LOW] && endOfOsc[i] > endOfOsc[u]) {
							if(oscMin > endOfOsc[u]) {
								return {index: data.length - 1 - (this.lookBackCandles - i), tradeDirection: TradeDirection.BUY};
							}
						}
					}

				}
			}
		}
		return {index: 0, tradeDirection: TradeDirection.HOLD};
	}
}