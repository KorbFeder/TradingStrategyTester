import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { TradeDirection } from "../Consts/TradeDirection";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { ManagePosition } from "../Models/ManagePosition-interface";
import { ITrade } from "../Models/TestAccount-model";

export class ManageFixedBarExit implements ManagePosition {
	private currentBar = 0;

	constructor(private exitOnBar: number) {}

	async manage(confirmationData: OHLCV, position: FuturePosition): Promise<ITrade | undefined> {
		this.currentBar++;
		if(this.currentBar >= this.exitOnBar) {
			let win = false;
			if(position.tradeDirection == TradeDirection.BUY) {
				win = confirmationData[Candlestick.CLOSE] > position.price;
			} else if(position.tradeDirection == TradeDirection.SELL) {
				win = confirmationData[Candlestick.CLOSE] < position.price;
			}
			return {
				initialSize: position.amount,
				tradeDirection: position.tradeDirection, 
				win, 
				date: new Date(confirmationData[Candlestick.TIMESTAMP]), 
				breakEvenPrice: position.breakEvenPrice, 
				exitPrice: confirmationData[Candlestick.CLOSE], 
				lastSize: position.amount,
				symbol: position.symbol, 
				firstEntry: position.price,
			};
		}	
	}

	reset(): void {
		this.currentBar = 0;
	}

}