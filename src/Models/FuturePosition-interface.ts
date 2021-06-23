import { TradeDirection } from "../Consts/TradeDirection";

export interface FuturePosition {
	symbol: string;
	price: number;
	buyOrderType: string;
	amount: number;
	tradeDirection: TradeDirection;
	stopLoss?: number;
	profitTargets?: ProfitTarget[]; 
}

export interface ProfitTarget {
	amount: number;
	price: number;
}