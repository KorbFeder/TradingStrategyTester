import { Exchange, OrderBook } from "ccxt";
import { TradeDirection } from "../Consts/TradeDirection";

export async function simulateSlippage(exchange: Exchange, posAmount: number, symbol: string, tradeDirection: TradeDirection): Promise<number | undefined> {
		const orderBook: OrderBook = await exchange.fetchOrderBook(symbol);
		let orderBookPrices: [number,number][] = [];
		if(tradeDirection == TradeDirection.BUY) {
			orderBookPrices = orderBook.asks;
		} else if(tradeDirection == TradeDirection.SELL) {
			orderBookPrices = orderBook.bids;
		}

		// fill order with orderbook
		let avgPrice = 0;
		let amount = posAmount;
		if(amount == 0) {
			throw "position would have a size of 0 which doesn't make sense";
		}
		for(const price of orderBookPrices) {
			if(amount - price[1] <= 0) {
				avgPrice += price[0] * (amount / posAmount);
				amount = 0;
				break;
			}
			avgPrice += price[0] * (price[1] / posAmount);
			amount -= price[1];
		}

		// if the orderbook would be so thin that position cant be filled
		if(amount != 0) {
			return avgPrice += orderBookPrices[orderBookPrices.length-1][0] * (amount / posAmount);
		}

		// once the order is filled set new price
		if(amount == 0 && orderBookPrices.length != 0) {
			return avgPrice;
		}
	}