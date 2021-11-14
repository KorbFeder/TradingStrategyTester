import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { TradeDirection } from "../Consts/TradeDirection";
import { calcBreakEvenPrice, FuturePosition } from "../Models/FuturePosition-interface";
import { ManagementType, ManagePosition } from "../Models/ManagePosition-interface";
import { ITrade } from "../Models/TestAccount-model";

export class ManageDefaultPosition implements ManagePosition {
	public supportedManagementTypes: ManagementType[] = [ManagementType.NORMAL, ManagementType.NORMAL_INDIVIDUAL, ManagementType.IGNORE_NEW_TRADES];
	private target_index: number = 0;
	private stop_index: number = 0;
	
	async manage(dataPoint: OHLCV, position: FuturePosition): Promise<ITrade | undefined> {
		const initialSize = position.amount;
		let avgFill: number = position.breakEvenPrice;
		let lastSize: number = position.amount;
		if(position.tradeDirection == TradeDirection.BUY) {
			if(dataPoint[Candlestick.LOW] < position.stopLosses[this.stop_index].price) {
				position.breakEvenPrice = calcBreakEvenPrice({price: position.breakEvenPrice, amount: position.amount}, position.stopLosses[this.stop_index]);
				position.amount -= position.stopLosses[this.stop_index].amount;
				if(position.amount > 0 && position.breakEvenPrice > 0) {
					this.stop_index++;
					avgFill = position.breakEvenPrice;
					lastSize = position.amount;
				} else {
					return {
						initialSize,
						tradeDirection: position.tradeDirection, 
						win: avgFill < position.stopLosses[this.stop_index].price, 
						date: new Date(dataPoint[Candlestick.TIMESTAMP]), 
						breakEvenPrice: avgFill, 
						exitPrice: position.stopLosses[this.stop_index].price, 
						lastSize,
						symbol: position.symbol, 
						firstEntry: position.price,
					};
				}
			} else if(dataPoint[Candlestick.HIGH] > position.profitTargets[this.target_index].price) {
				position.breakEvenPrice = calcBreakEvenPrice({price: position.breakEvenPrice, amount: position.amount}, position.profitTargets[this.target_index]);
				position.amount -= position.profitTargets[this.target_index].amount;
				if(position.amount > 0 && position.breakEvenPrice > 0) {
					this.target_index++;
					avgFill = position.breakEvenPrice;
					lastSize = position.amount;
				} else {
					return {
						initialSize,
						tradeDirection: position.tradeDirection, 
						win: avgFill < position.profitTargets[this.target_index].price, 
						date: new Date(dataPoint[Candlestick.TIMESTAMP]), 
						breakEvenPrice: avgFill, 
						exitPrice: position.profitTargets[this.target_index].price, 
						firstEntry: position.price,
						lastSize,
						symbol: position.symbol
					};
				}
			}
		} else if(position.tradeDirection == TradeDirection.SELL) {
			if(dataPoint[Candlestick.HIGH] > position.stopLosses[this.stop_index].price) {
				position.breakEvenPrice = calcBreakEvenPrice({price: position.breakEvenPrice, amount: position.amount}, position.stopLosses[this.stop_index]);
				position.amount -= position.stopLosses[this.stop_index].amount;
				if(position.amount > 0 && position.breakEvenPrice > 0) {
					this.stop_index++;
					avgFill = position.breakEvenPrice;
					lastSize = position.amount;
				} else {
					return {
						initialSize,
						tradeDirection: position.tradeDirection, 
						win: avgFill > position.stopLosses[this.stop_index].price, 
						date: new Date(dataPoint[Candlestick.TIMESTAMP]), 
						breakEvenPrice: avgFill, 
						exitPrice: position.stopLosses[this.stop_index].price, 
						firstEntry: position.price,
						lastSize,
						symbol: position.symbol
					};
				}
			} else if(dataPoint[Candlestick.LOW] < position.profitTargets[this.target_index].price) {
				position.breakEvenPrice = calcBreakEvenPrice({price: position.breakEvenPrice, amount: position.amount}, position.profitTargets[this.target_index]);
				position.amount -= position.profitTargets[this.target_index].amount;
				if(position.amount > 0 && position.breakEvenPrice > 0) {
					this.target_index++;
					avgFill = position.breakEvenPrice;
					lastSize = position.amount;
				} else {
					return {
						initialSize,
						tradeDirection: position.tradeDirection, 
						win: avgFill > position.profitTargets[this.target_index].price, 
						date: new Date(dataPoint[Candlestick.TIMESTAMP]), 
						breakEvenPrice: avgFill, 
						exitPrice: position.profitTargets[this.target_index].price, 
						firstEntry: position.price,
						lastSize,
						symbol: position.symbol
					};
				}
			}
		}
		if(this.stop_index >= position.stopLosses.length) {
			throw 'not enough take stopLoss orders were set, there is still some position size over that has not been sold'
		}
		if(this.target_index >= position.profitTargets.length) {
			throw 'not enough take profit orders were set, there is still some position size over that has not been sold'
		}
	}

	reset() {
		this.target_index = 0;
		this.stop_index = 0;
	}
}