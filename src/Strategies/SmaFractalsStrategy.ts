import { OHLCV, Exchange } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { CrossUpside } from "../helper";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { RMA } from "../Technicals/RMA";
import { SmoothRsi } from "../Technicals/SmoothRsi";
import { WilliamsFractals } from "../Technicals/WilliamsFractals";

export class SmaFractialsStrategy implements IStrategy {
	usesDynamicExit: boolean = false;
	private fastLength = 21;
	private middleLength = 50;
	private slowLength = 200;
	private rmaCrossLength = 15;

	async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
		const fastRma: number[] = RMA.calculate(data.map(d => d[Candlestick.CLOSE]), this.fastLength);
		const fastRmaLast: number[] = fastRma.slice(fastRma.length - this.rmaCrossLength, fastRma.length);
		const middleRma: number[] = RMA.calculate(data.map(d => d[Candlestick.CLOSE]), this.middleLength);
		const middleRmaLast: number[] = middleRma.slice(middleRma.length - this.rmaCrossLength, middleRma.length);
		const slowRma: number[] = RMA.calculate(data.map(d => d[Candlestick.CLOSE]), this.slowLength);
		const slowRmaLast: number[] = slowRma.slice(slowRma.length - this.rmaCrossLength, slowRma.length);

		const rsi = SmoothRsi.calculate(data.map(d => d[Candlestick.CLOSE]), 14);
		const fractal = WilliamsFractals.calculate(data);

		if(CrossUpside(middleRmaLast, slowRmaLast) && CrossUpside(fastRmaLast, middleRmaLast) && rsi[rsi.length - 1] > 50) {
			// bullish signal
			if(fractal[fractal.length-3].downFractal && data[data.length-1][Candlestick.CLOSE] > fastRma[fastRma.length-1]) {
				return TradeDirection.BUY;
			}
		} else if(CrossUpside(slowRmaLast, middleRmaLast) && CrossUpside(middleRmaLast, fastRmaLast) && rsi[rsi.length - 1] < 50) {
			// bearish signal
			if(fractal[fractal.length-3].upFractal && data[data.length-1][Candlestick.CLOSE] < slowRmaLast[slowRmaLast.length-1]) {
				return TradeDirection.SELL;
			}
		}
		return TradeDirection.HOLD;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stop: number; target: number; }> {
		return StopLoss.atr(data, data[data.length-1][Candlestick.CLOSE], direction);
	}

	dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		throw new Error("Method not implemented.");
	}

}