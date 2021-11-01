import { Balance, Balances, Exchange, OHLCV, Order } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { PositionSize } from "./PositionSize";
import { StopLoss } from "./StopLoss";

export class Orders {

	constructor(private exchange: Exchange){}

	async marketOrder(symbol: string, amount: number, price: number, tradeDirection: TradeDirection): Promise<Order[] | undefined>  {
		const futurePosition: FuturePosition = {
			breakEvenPrice: price,
			symbol,
			price,
			amount,
			tradeDirection,
			buyOrderType: 'market',
			stopLosses: [],
			profitTargets: []
		}
		return this.createPosition(futurePosition);
	}
	

	async createPosition(futurePosition: FuturePosition): Promise<Order[] | undefined> {
		try{
			if(!futurePosition.symbol.includes('-PERP')) {
				return undefined;
			}

			// check if there is alreay an order or an order was prepared for this
			const positionStatus = await this.checkPositionStatus(futurePosition.symbol);
			if(positionStatus.ordersActive || positionStatus.positionActive || positionStatus.triggerOrdersActive) {
				return undefined;
			}

			// only have a certain amount of positions open at a time
			let maxPositions: number = 10;
			const maxPos = process.env.MAX_POSITIONS;
			if(maxPos) {
				maxPositions = parseInt(maxPos);
			}
			if(maxPositions <= await this.positionSize()) {
				return undefined;
			}
			console.log(futurePosition);

			if(futurePosition.tradeDirection == TradeDirection.SELL) {
				// sell order
				const orders: Order[] = [];
				const position = await this.exchange.createOrder(futurePosition.symbol, futurePosition.buyOrderType, 'sell', futurePosition.amount, futurePosition.price);
				orders.push(position);
				for(let stop of futurePosition.stopLosses) {
					const stopLossPosition = await this.exchange.createOrder(futurePosition.symbol, 'stop', 'buy', stop.amount, undefined, {reduceOnly: true, 'triggerPrice': stop.price});
					orders.push(stopLossPosition);
				}
				for(let target of futurePosition.profitTargets) {
					const targetPosition = await this.exchange.createOrder(futurePosition.symbol, 'takeProfit', 'buy', target.amount, undefined ,{reduceOnly: true, 'triggerPrice': target.price});
					orders.push(targetPosition);
				}
				return orders;
			} else if(futurePosition.tradeDirection == TradeDirection.BUY) {
				// buy order
				const orders: Order[] = [];
				const position = await this.exchange.createOrder(futurePosition.symbol, futurePosition.buyOrderType, 'buy', futurePosition.amount, futurePosition.price);
				orders.push(position);
				for(let stop of futurePosition.stopLosses) {
					const stopLossPosition = await this.exchange.createOrder(futurePosition.symbol, 'stop', 'sell', stop.amount, undefined, {'reduceOnly': true, 'triggerPrice': stop.price});
					orders.push(stopLossPosition);
				}
				for(let target of futurePosition.profitTargets) {
					const targetPosition = await this.exchange.createOrder(futurePosition.symbol, 'takeProfit', 'sell', target.amount, undefined ,{'reduceOnly': true, 'triggerPrice': target.price});
					orders.push(targetPosition);
				}
				return orders;
				
			}
		} catch(err) {
			console.log(err);
			this.closePosition(futurePosition.symbol);
			return undefined;
		}
	}

	async removeUselessOrders() {
		const triggerOrders = await this.exchange.fetchOpenOrders(undefined, undefined, undefined, {'method':'privateGetConditionalOrders'});
		const orders = await this.exchange.fetchOpenOrders();
		const combinedOrders = orders.concat(triggerOrders);
		for(let order of combinedOrders) {
			const position = await this.checkPositionStatus(order.symbol);
			if(!position.positionActive) {
				const canceldOrders = await this.exchange.cancelAllOrders(order.symbol);
			}
		}
	}

	async positionSize(): Promise<number> {
		const positions = await this.exchange.fetchPositions();
		let size = 0;
		for(let position of positions) {
			if(parseFloat(position.size) > 0) {
				size++;
			}
		}
		return size;
	}

	async checkPositionStatus(symbol: string) {
		let positionActive = false;
		const positions = await this.exchange.fetchPositions();
		for(let position of positions) {
			if(position.future == symbol && parseFloat(position.size) > 0) {
				positionActive = true;
			}
		}
		const orders = await this.exchange.fetchOpenOrders(symbol);
		const triggerOrders = await this.exchange.fetchOpenOrders(symbol, undefined, undefined, {'method':'privateGetConditionalOrders'});
		return {positionActive, ordersActive: orders.length > 0, triggerOrdersActive: triggerOrders.length > 0};
	}

	async closePosition(symbol: string): Promise<boolean> {
		try{
			const positions = await this.exchange.fetchPositions();
			for(let position of positions) {
				if(position.future == symbol && parseFloat(position.size) > 0) {
					const side = position.side == 'buy' ? 'sell' : 'buy';
					const orderRespone = await this.exchange.createOrder(symbol, 'market', side, position.openSize);
				}
			}
			const canceldOrders = await this.exchange.cancelAllOrders(symbol);
			return true;
		} catch(err) {
			this.closePosition(symbol);
			return false;
		}
	}

	
	async stopLoss(symbol: string, amount: number, stopLoss: number, tradeDirection: TradeDirection): Promise<Order | undefined> {
		let stopLossPosition = undefined;
		if(tradeDirection == TradeDirection.SELL) {
			stopLossPosition = await this.exchange.createOrder(symbol, 'stop', 'buy', amount, undefined, {'reduceOnly': true, 'triggerPrice': stopLoss});
		} else if(tradeDirection == TradeDirection.BUY) {
			stopLossPosition = await this.exchange.createOrder(symbol, 'stop', 'sell', amount, undefined, {'reduceOnly': true, 'triggerPrice': stopLoss});
		}
		return stopLossPosition;
	}
}