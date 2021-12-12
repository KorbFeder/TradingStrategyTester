import { Socket } from "dgram";
import { CandleData, EMA, MACD } from "technicalindicators";
import { MACDInput, MACDOutput } from "technicalindicators/declarations/moving_averages/MACD";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { ConvertToHigherTimeframe } from "../helpers/ConvertToHigherTimeframe";
import { IDataProvider } from "../Models/DataProvider-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { Divergence } from "../Technicals/Divergence";
import { OptimizationParameters } from "../Testing/Optimizing";

export class MtfMacdStrategy implements IStrategy {
	constructor(private symbol: string) {}
	private lastSwing: number = 0;

	// 50 for lookback of emas and furthest lookback is 1h timeframe, on default 5 min timeframe
	barsNeededForIndicator: number = 50 * 60;

	async calculate(dataProvider: IDataProvider): Promise<TradeDirection> {
		const data = await dataProvider.getOhlcv(this.symbol, Timeframe.m5);
		
		// calculate the MTF EMAs
		const period: number = 50;
		const m15Data = ConvertToHigherTimeframe.convert(data, Timeframe.m5, Timeframe.m15).map(ohlcv => ohlcv[Candlestick.CLOSE]);
		const maInput_m15: MAInput = {
			period: m15Data.length < period ? m15Data.length : period,
			values: m15Data
		}
		const h1Data = ConvertToHigherTimeframe.convert(data, Timeframe.m5, Timeframe.h1).map(ohlcv => ohlcv[Candlestick.CLOSE]);
		const maInput_h1 = {
			period: h1Data.length < period ? h1Data.length : period,
			values: h1Data 
		}
		const mtfEmaFast = EMA.calculate(maInput_m15);
		const mtfEmaSlow = EMA.calculate(maInput_h1);

		// calculate macd
		const macdInput: MACDInput = {
			values: data.map(val => val[Candlestick.CLOSE]),
			fastPeriod: 12,
			slowPeriod: 26,
			signalPeriod: 9, 
			SimpleMAOscillator: false,
			SimpleMASignal    : false 
		};
		const macdOutput: MACDOutput[] = MACD.calculate(macdInput);
		const macd = macdOutput[macdOutput.length-1].MACD;
		const signal = macdOutput[macdOutput.length-1].signal;

		if(mtfEmaFast[mtfEmaFast.length-1] < mtfEmaSlow[mtfEmaSlow.length-1]) {
			// shorts only
			if(macd && signal && macd > 0 && signal > 0) {
				const macdDiv = Divergence.macd(await dataProvider.getOhlcv(this.symbol, Timeframe.m5));
				if(macdDiv.tradeDirection == TradeDirection.SELL) {
					// check if macd stayed above 0 line while the div formed
					const stop = macdOutput.length - (data.length - macdDiv.firstIndex);
					let above = true;
					for(let i = macdOutput.length - 1; i > stop; i--) {
						const macd = macdOutput[i].MACD;
						if(macd) {
							if(macd < 0) {
								above = false
							}
						}
					}
					if(above) {
						this.lastSwing = Candlestick.high(data, macdDiv.secondIndex);
						return TradeDirection.SELL;
					}
				}
			}
			
		}

		if(mtfEmaFast[mtfEmaFast.length-1] > mtfEmaSlow[mtfEmaSlow.length-1]) {
			// long only
			if(macd && signal && macd < 0 && signal < 0) {
				const macdDiv = Divergence.macd(await dataProvider.getOhlcv(this.symbol, Timeframe.m5));
				if(macdDiv.tradeDirection == TradeDirection.BUY) {
					// check if macd stayed below 0 line while the div formed
					const stop = macdOutput.length - (data.length - macdDiv.firstIndex);
					let below = true;
					for(let i = macdOutput.length - 1; i > stop; i--) {
						const macd = macdOutput[i].MACD;
						if(macd) {
							if(macd > 0) {
								below = false
							}
						}
					}
					if(below) {
						this.lastSwing = Candlestick.low(data, macdDiv.secondIndex);
						return TradeDirection.BUY
					}
				}
			}
		}

		return TradeDirection.HOLD;
	}

	async getStopLoss(dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection): Promise<LimitOrder[]> {
		if(tradeDirection == TradeDirection.BUY) {
			if(entryPrice < this.lastSwing) {
				return StopLoss.defaultAtr(await dataProvider.getOhlcv(this.symbol, Timeframe.m5), entryPrice, tradeDirection).stops;
			}
		} else if(tradeDirection == TradeDirection.SELL) {
			if(entryPrice > this.lastSwing) {
				return StopLoss.defaultAtr(await dataProvider.getOhlcv(this.symbol, Timeframe.m5), entryPrice, tradeDirection).stops;
			}
		}
		return [{price: this.lastSwing, amount: 1}];
	}

	async getTarget(dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection): Promise<LimitOrder[]> {
		const otherSide = entryPrice - this.lastSwing
		if(tradeDirection == TradeDirection.BUY) {
			if(entryPrice < this.lastSwing) {
				return StopLoss.defaultAtr(await dataProvider.getOhlcv(this.symbol, Timeframe.m5), entryPrice, tradeDirection).targets;
			}
		} else if(tradeDirection == TradeDirection.SELL) {
			if(entryPrice > this.lastSwing) {
				return StopLoss.defaultAtr(await dataProvider.getOhlcv(this.symbol, Timeframe.m5), entryPrice, tradeDirection).targets;
			}
		}
		return [{price: entryPrice + otherSide * 2, amount: 1}];
	}

	async checkExit(dataProvider: IDataProvider, tradeDirection: TradeDirection): Promise<boolean> {
		return false
	}

	getParams(): OptimizationParameters[] {
		throw new Error("Method not implemented.");
	}

	setParams(value: number[]): void {
		throw new Error("Method not implemented.");
	}

	getDefaultParams(): number[] {
		throw new Error("Method not implemented.");
	}
}