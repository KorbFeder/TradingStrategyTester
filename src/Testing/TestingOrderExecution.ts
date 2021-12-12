import { TradeDirection } from "../Consts/TradeDirection";
import { Database } from "../Database/Database";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { IPosition } from "../Models/Position-model";
import { IOrderExecution } from "../Models/OrderExecution-interface";
import { ITrade } from "../Models/TestAccount-model";
import { TestAccount } from "./TestAccount";
import { ManageDefaultPosition } from "../Orders/ManageDefaultPosition";
import { IDataProvider } from "../Models/DataProvider-interface";
import { Timeframe } from "../Consts/Timeframe";
import { Exchange, OHLCV, OrderBook } from "ccxt";
import { sleep } from "../helper";
import { simulateSlippage } from "../helpers/simulateSlippage";
import { ManageSimulatedLivePosition } from "../Orders/ManageSimulatedLivePosition";

export class TestingOrderExecution implements IOrderExecution {
	private testAccount: TestAccount = new TestAccount(this.db, this.dbName, this.startingBalance);
	private manage = new ManageSimulatedLivePosition();

	constructor(
		private db: Database,
		private dbName: string,
		private startingBalance: number,
		private exchange: Exchange,
		private includeFees: boolean = false
	) {}

	async createPosition(position: FuturePosition): Promise<void> {
		// roundtrip time, that it takes for the api call to reach the exchange
		await sleep(500);

		// calculate slippage that would happen on real trading
		const price = await simulateSlippage(this.exchange, position.amount, position.symbol, position.tradeDirection);
		if(price && this.includeFees) {
			position.price = price;
			position.breakEvenPrice = price;
		}
		console.log('entering position', position);
		await this.db.savePosition(position);
	}

	async closePosition(symbol: string, exitPrice: number): Promise<void> {
		let positions: IPosition[] = await this.db.loadPosition();
		positions = positions.filter(order => order.position.symbol == symbol);
		// @todo -> calculate slippage for exiting
		for(let position of positions) {
			const win: boolean = position.position.tradeDirection == TradeDirection.BUY ? position.position.breakEvenPrice < exitPrice : position.position.breakEvenPrice > exitPrice;
			const trade = {
				tradeDirection: position.position.tradeDirection,
				initialSize: position.position.amount,
				win,
				symbol: position.position.symbol,
				date: new Date(Date.now()),
				firstEntry: position.position.price,
				breakEvenPrice: position.position.breakEvenPrice,
				lastSize: position.position.amount,
				exitPrice: exitPrice
			};
			await this.testAccount.update(trade, this.exchange, this.includeFees);
			console.log('exiting position', trade);
			await this.db.removePosition(position._id);
			await this.db.logTrade(trade);
		}
	}

	async getPosition(symbol: string): Promise<FuturePosition | undefined> {
		let positions: IPosition[] = await this.db.loadPosition();
		if(positions.length <= 0) {
			return undefined;
		}
		positions = positions.filter(pos => pos.position.symbol == symbol);
		const order: IPosition = positions[0];
		return order.position;
	}

	async getTrades(symbol: string): Promise<ITrade[]> {
		return this.testAccount.getTrades(symbol);
	}

	async checkPosition(dataProvider: IDataProvider, symbol: string, timeframe: Timeframe): Promise<void> {
		const data: OHLCV[] = await dataProvider.getOhlcv(symbol, timeframe);
		let positions: IPosition[] = await this.db.loadPosition();
		positions = positions.filter(order => order.position.symbol == symbol);
	
		for(let position of positions) {
			if(position) {
				const trade: ITrade | undefined = await this.manage.manage(data[data.length-1], position.position);
				if(trade) {
					await this.testAccount.update(trade, this.exchange, this.includeFees);
					await this.db.removePosition(position._id);
					await this.db.logTrade(trade);
					this.manage.reset();
					console.log('exit position', position.position);
				}
			}
		}
	}

	getBalance(): Promise<number> {
		return this.testAccount.getBalance();
	}
}