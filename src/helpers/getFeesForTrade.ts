import { Exchange } from "ccxt";
import { ITrade } from "../Models/TestAccount-model";

export function getFeesForTrade(trade: ITrade, exchange: Exchange): number {
	const fees = exchange.markets[trade.symbol]['taker'];
	const allFees = fees * trade.initialSize * trade.firstEntry + fees * trade.initialSize * trade.exitPrice;
	return allFees;
}