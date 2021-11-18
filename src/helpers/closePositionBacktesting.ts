import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { TradeDirection } from "../Consts/TradeDirection";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { ITrade } from "../Models/TestAccount-model";

export function closePositionBacktesting(data: OHLCV[], currPosition: FuturePosition | undefined): ITrade | undefined {
	if(currPosition) {
		const exitPrice = Candlestick.close(data);
		return {
			initialSize: currPosition.amount,
			tradeDirection: currPosition.tradeDirection, 
			win: currPosition.tradeDirection == TradeDirection.BUY ? currPosition.price < exitPrice : currPosition.price > exitPrice, 
			date: new Date(Candlestick.timestamp(data)), 
			breakEvenPrice: currPosition.breakEvenPrice, 
			exitPrice, 
			lastSize: currPosition.amount,
			symbol: currPosition.symbol, 
			firstEntry: currPosition.price,
		}
	}
}