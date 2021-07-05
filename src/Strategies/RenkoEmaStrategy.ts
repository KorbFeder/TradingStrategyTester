import { Exchange, OHLCV } from "ccxt";
import { EMA } from "technicalindicators";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { TradeDirection } from "../Consts/TradeDirection";
import { Candlestick } from "../Consts/Candlestick";
import { IStrategy } from "../Models/Strategy-interface";
import { Renko, RenkoBrick } from "../Technicals/Renko";
import { CrossUpside } from "../helper";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { RenkoDynamicExit } from "../Orders/RenkoDynamicExit";
import { Timeframe } from "../Consts/Timeframe";
import { PivotExtremes } from "../Technicals/PivotExtremes";
import { SmoothRsi } from "../Technicals/SmoothRsi";

export class RenkoEmaStrategy implements IStrategy {
	public usesDynamicExit: boolean = true;
	private emaPeriod: number = 21;
	private rsiPeriod: number = 14
	private crossCheckSize: number = 2;
	private brickSize = -1;
	private stopLossBricks = 8;
	private rsiOversold = 20;
	private rsiOverbought = 80;

	async calculate(data: OHLCV[], optional?: any): Promise<TradeDirection> {
		this.brickSize = Renko.percentageBricksize(data);
		const renkoBricks: RenkoBrick[] = Renko.traditional(data, this.brickSize);
		const _renkoAvg = renkoBricks.map((renko) => (renko.high + renko.low) / 2);
		const emaInput: MAInput = {
			period: this.emaPeriod,
			values: _renkoAvg
		}
		const _emaResult: number[] = EMA.calculate(emaInput);

		const rsiExtremes: TradeDirection = this.checkRsiExtremes(_renkoAvg);

		// count ghost candles, candles that are not confirmed yet
		let ghostCandleCount: number = 0;
		for(let i = renkoBricks.length-1; i >= 0; i--) {
			if(renkoBricks[i].ghost) {
				ghostCandleCount++;
			} else {
				break;
			}
		}

		// -1 because the confirmation box to confirm the cross 
		const emaResult = _emaResult.slice(_emaResult.length - this.crossCheckSize - 1 - ghostCandleCount, _emaResult.length - 1 - ghostCandleCount);
		const renkoAvg = _renkoAvg.slice(_renkoAvg.length - this.crossCheckSize - 1 - ghostCandleCount, _renkoAvg.length - 1 - ghostCandleCount);

		if(CrossUpside(emaResult, renkoAvg) && Renko.isRedCandle(renkoBricks, renkoBricks.length-1) && rsiExtremes == TradeDirection.SELL) {
			const brickCount = Math.abs((renkoAvg[1] - renkoBricks[renkoBricks.length-1].low) / this.brickSize);
			if(brickCount < 3) {
				return TradeDirection.SELL;
			}
		}
		if(CrossUpside(renkoAvg, emaResult) && Renko.isGreenCandle(renkoBricks, renkoBricks.length-1) && rsiExtremes == TradeDirection.BUY) {
			const brickCount = Math.abs((renkoBricks[renkoBricks.length-1].high - renkoAvg[1]) / this.brickSize);
			if(brickCount < 3) {
				return TradeDirection.BUY;
			}
		}
		return TradeDirection.HOLD;
	}

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stop: number; target: number; }> {
		const entry: number = data[data.length-1][Candlestick.CLOSE];
		let stopLoss: number = -1;
		if(direction == TradeDirection.BUY) {
			stopLoss = entry - (this.stopLossBricks * this.brickSize);
		} else if(direction == TradeDirection.SELL) {
			stopLoss = entry + (this.stopLossBricks * this.brickSize);
		}
        return {stop: stopLoss, target: -1};
	}

	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
		const renkoExit: RenkoDynamicExit = new RenkoDynamicExit(exchange, symbol, timeframe, this.brickSize, tradeDirection);
		return renkoExit;
	}

	private checkRsiExtremes(renkoAvg: number[]) {
		const rsiValues = SmoothRsi.calculate(renkoAvg, this.rsiPeriod);
		const data: OHLCV[] = rsiValues.map(d => [-1, d, d, d, d, -1]);

		const leftHigh = PivotExtremes.leftHigh(data, data.length-1);
		const leftLow = PivotExtremes.leftLow(data, data.length-1);

		if(rsiValues[leftHigh.index] > this.rsiOverbought) {
			return TradeDirection.SELL;
		} else if(rsiValues[leftLow.index] < this.rsiOversold) {
			return TradeDirection.BUY;
		}
		return TradeDirection.HOLD;
	}
}