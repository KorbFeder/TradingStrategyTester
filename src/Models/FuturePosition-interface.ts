import { TradeDirection } from "../Consts/TradeDirection";

export interface FuturePosition {
	symbol: string;
	price: number;
	buyOrderType: string;
	amount: number;
	tradeDirection: TradeDirection;
	breakEvenPrice: number;
	stopLosses: LimitOrder[];
	profitTargets: LimitOrder[]; 
}

export interface LimitOrder{
	amount: number;
	price: number;
}

export function calcBreakEvenPrice(openOrder: LimitOrder, paritalClosingOrder: LimitOrder) {
	const orderSizeDiff = openOrder.amount - paritalClosingOrder.amount;
	if(orderSizeDiff <= 0) {
		// order fully closed
		return 0;
	}
	return (openOrder.price * openOrder.amount - paritalClosingOrder.price * paritalClosingOrder.amount) / (orderSizeDiff);

}