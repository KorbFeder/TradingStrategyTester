import { Exchange, OHLCV, Order } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { FuturePosition, LimitOrder } from "../Models/FuturePosition-interface";
import { Orders } from "./Orders";
import { PositionSize } from "./PositionSize";
import { StopLoss } from "./StopLoss";

export class OrderType {
	private orders: Orders;

	constructor(private exchange: Exchange){
		this.orders = new Orders(exchange);
	}

	public async defaultMarketOrder(symbol: string, price: number, tradeDirection: TradeDirection, timeframe: Timeframe): Promise<Order[] | undefined>  {
		const account = await this.exchange.privateGetAccount();
		const collateral = account.result.freeCollateral;

		const data: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframe);
		const {stops: stopLoss, targets} = StopLoss.atr(data, price, tradeDirection);
	
		const amount = PositionSize.calculate(collateral, price, stopLoss);
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
		return this.orders.createPosition(futurePosition);
	}

	async defaultPosition(symbol: string, price: number, timeframe: Timeframe, tradeDirection: TradeDirection) {
		const account = await this.exchange.privateGetAccount();
		const collateral = account.result.freeCollateral;

		const data: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframe);
		const {stops: stopLoss, targets} = StopLoss.atr(data, price, tradeDirection);
	
		const amount = PositionSize.calculate(collateral, price, stopLoss);
		const futurePosition: FuturePosition = {
			breakEvenPrice: price,
			symbol,
			price,
			buyOrderType: 'market',
			amount,
			tradeDirection,
			stopLosses: stopLoss,
			profitTargets: targets
		}
		return this.orders.createPosition(futurePosition);
	}

	
}