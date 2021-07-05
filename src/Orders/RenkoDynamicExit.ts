import { Exchange, OHLCV } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { Renko, RenkoBrick } from "../Technicals/Renko";

export class RenkoDynamicExit implements IDynamicExit {
	private exitCandleCount: number = 3;
	
	constructor(
		public exchange: Exchange, 
		public symbol: string,
		public timeframe: Timeframe,
		private brickSize: number,
		public tradeDirection: TradeDirection
	) {}

	async exitTrade(): Promise<boolean> {
		const data: OHLCV[] = await this.exchange.fetchOHLCV(this.symbol, this.timeframe)
		if(this.brickSize < 0) {
			this.brickSize = Renko.percentageBricksize(data);
		}
		const renkoBricks: RenkoBrick[] = Renko.traditional(data, this.brickSize).filter(r => !r.ghost);

		if(this.tradeDirection == TradeDirection.BUY) {
			// check if last x candles are red
			let isRed = true;
			for(let i = renkoBricks.length - 1; i > renkoBricks.length - 1 - this.exitCandleCount; i--) {
				if(Renko.isGreenCandle(renkoBricks, i)) {
					isRed = false;
				}
			}
			return isRed;
		} else if(this.tradeDirection == TradeDirection.SELL) {
			// check if last x candles are green
			let isGreen = true;
			for(let i = renkoBricks.length - 1; i > renkoBricks.length - 1 - this.exitCandleCount; i--) {
				if(Renko.isRedCandle(renkoBricks, i)) {
					isGreen = false;
				}
			}
			return isGreen;
		}
		return false;
	}

	async backTestExit(confirmationData: OHLCV[]): Promise<number> {
		if(this.brickSize < 0) {
			this.brickSize = Renko.percentageBricksize(confirmationData);
		}
		const renkoBricks: RenkoBrick[] = Renko.traditional(confirmationData, this.brickSize).filter(r => !r.ghost);

		if(this.tradeDirection == TradeDirection.BUY) {
			// check if last x candles are red
			let redCandleCount = 0;
			for(let i = 0; i < renkoBricks.length - 1; i++) {
				if(Renko.isGreenCandle(renkoBricks, i)) {
					redCandleCount = 0;
				}
				redCandleCount++;
				if(redCandleCount == this.exitCandleCount) {
					return renkoBricks[i].low;
				}
			}
		} else if(this.tradeDirection == TradeDirection.SELL) {
			// check if last x candles are green
			let greenCandleCount = 0;
			for(let i = 0; i < renkoBricks.length - 1; i++) {
				if(Renko.isRedCandle(renkoBricks, i)) {
					greenCandleCount = 0;
				}
				greenCandleCount++;
				if(greenCandleCount == this.exitCandleCount) {
					return renkoBricks[i].high;
				}
			}
		}
		return -1;
	}
}