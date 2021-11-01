import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { TradeDirection } from "../Consts/TradeDirection";
import { calcBreakEvenPrice, FuturePosition, LimitOrder } from "../Models/FuturePosition-interface";
import { ManagePosition } from "../Models/ManagePosition-interface";
import { ITrade } from "../Models/TestAccount-model";

/**
 * Simular to the old Manage Multipart Position Offline, but with moving the the Stoploss after a take profit
 */
export class ManageDynMultiPostionOffline implements ManagePosition {
	private priceLevels: number[] = [];

	public async manage(confirmationData: OHLCV[], position: FuturePosition): Promise<ITrade | undefined> {
		this.priceLevels = [...position.stopLosses.slice().reverse().map(stop => stop.price), position.price , ...position.profitTargets.map(target => target.price)];
		const initialSize = position.amount;
		let target_index: number = 0;
		let stop_index: number = 0;
		let avgFill: number = position.breakEvenPrice;
		let lastSize: number = position.amount;
		for(let i = 0; i < confirmationData.length; i++) {
			if(position.tradeDirection == TradeDirection.BUY) {
				if(Candlestick.low(confirmationData, i) < position.stopLosses[stop_index].price) {
					// stop hit 
					position.breakEvenPrice = calcBreakEvenPrice({price: position.breakEvenPrice, amount: position.amount}, position.stopLosses[stop_index]);
					position.amount -= position.stopLosses[stop_index].amount;
					if(position.amount > 0 && position.breakEvenPrice > 0) {
						stop_index++;
						avgFill = position.breakEvenPrice;
						lastSize = position.amount;
					} else {
						return {
							initialSize,
							tradeDirection: position.tradeDirection, 
							win: avgFill < position.stopLosses[stop_index].price, 
							date: new Date(Candlestick.timestamp(confirmationData, i)), 
							breakEvenPrice: avgFill, 
							exitPrice: position.stopLosses[stop_index].price, 
							lastSize,
							symbol: position.symbol, 
							firstEntry: Candlestick.close(confirmationData, 0),
						};
					}
				} else if(Candlestick.high(confirmationData, i) > position.profitTargets[target_index].price) {
					// target hit
					position.breakEvenPrice = calcBreakEvenPrice({price: position.breakEvenPrice, amount: position.amount}, position.profitTargets[target_index]);
					position.amount -= position.profitTargets[target_index].amount;
					if(position.amount > 0 && position.breakEvenPrice > 0) {
						this.moveStopLossUp(position);
						target_index++;
						avgFill = position.breakEvenPrice;
						lastSize = position.amount;
					} else {
						return {
							initialSize,
							tradeDirection: position.tradeDirection, 
							win: avgFill < position.profitTargets[target_index].price, 
							date: new Date(Candlestick.timestamp(confirmationData, i)), 
							breakEvenPrice: avgFill, 
							exitPrice: position.profitTargets[target_index].price, 
							firstEntry: Candlestick.close(confirmationData, 0),
							lastSize,
							symbol: position.symbol
						};
					}
				}
			} else if(position.tradeDirection == TradeDirection.SELL) {
				if(Candlestick.high(confirmationData, i) > position.stopLosses[stop_index].price) {
					position.breakEvenPrice = calcBreakEvenPrice({price: position.breakEvenPrice, amount: position.amount}, position.stopLosses[stop_index]);
					position.amount -= position.stopLosses[stop_index].amount;
					if(position.amount > 0 && position.breakEvenPrice > 0) {
						stop_index++;
						avgFill = position.breakEvenPrice;
						lastSize = position.amount;
					} else {
						return {
							initialSize,
							tradeDirection: position.tradeDirection, 
							win: avgFill > position.stopLosses[stop_index].price, 
							date: new Date(Candlestick.timestamp(confirmationData, i)), 
							breakEvenPrice: avgFill, 
							exitPrice: position.stopLosses[stop_index].price, 
							firstEntry: Candlestick.close(confirmationData, 0),
							lastSize,
							symbol: position.symbol
						};
					}
				} else if(Candlestick.low(confirmationData, i) < position.profitTargets[target_index].price) {
					position.breakEvenPrice = calcBreakEvenPrice({price: position.breakEvenPrice, amount: position.amount}, position.profitTargets[target_index]);
					position.amount -= position.profitTargets[target_index].amount;
					if(position.amount > 0 && position.breakEvenPrice > 0) {
						this.moveStopLossUp(position);
						target_index++;
						avgFill = position.breakEvenPrice;
						lastSize = position.amount;
					} else {
						return {
							initialSize,
							tradeDirection: position.tradeDirection, 
							win: avgFill > position.profitTargets[target_index].price, 
							date: new Date(Candlestick.timestamp(confirmationData, i)), 
							breakEvenPrice: avgFill, 
							exitPrice: position.profitTargets[target_index].price, 
							firstEntry: Candlestick.close(confirmationData, 0),
							lastSize,
							symbol: position.symbol
						};
					}
				}
			}
			if(stop_index >= position.stopLosses.length) {
				throw 'not enough take stopLoss orders were set, there is still some position size over that has not been sold'
			}
			if(target_index >= position.profitTargets.length) {
				throw 'not enough take profit orders were set, there is still some position size over that has not been sold'
			}
		}	
	}

	private moveStopLossUp(position: FuturePosition) {
		position.stopLosses.forEach(stop => stop.price = this.priceLevels[this.priceLevels.indexOf(stop.price)+1]);
	}
}