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
}