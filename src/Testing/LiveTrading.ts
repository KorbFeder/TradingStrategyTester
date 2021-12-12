import { Exchange } from "ccxt";
import { getHeapStatistics } from "v8";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { PerfReportHelper } from "../helpers/PerfReportHelper";
import { FuturePosition, LimitOrder } from "../Models/FuturePosition-interface";
import { IOrderExecution } from "../Models/OrderExecution-interface";
import { PerformanceReport } from "../Models/PerformanceReport-model";
import { IStrategy } from "../Models/Strategy-interface";
import { ITrade } from "../Models/TestAccount-model";
import { PositionSize } from "../Orders/PositionSize";
import { LiveDataProvider } from "./LiveDataProvider";

export interface LiveTradingConfig {
	strategy: IStrategy;
	symbol: string;
	timeframe: Timeframe;
	includeComissions?: boolean;
}

export class LiveTrading {
	private startDate: Date;
	private dataProvider: LiveDataProvider = new LiveDataProvider(this.exchange);

	constructor(
		private exchange: Exchange,
		private orderExecution: IOrderExecution,
		private endDate?: Date,
	) {
		this.startDate = new Date();
	}

	async start(config: LiveTradingConfig): Promise<PerformanceReport> {
		while(true) {
			if(this.endDate && Date.now() > this.endDate.getTime()) {
				break;
			}
			try{
				const tradeDirection: TradeDirection = await config.strategy.calculate(this.dataProvider);
				if(tradeDirection != TradeDirection.HOLD) {
					await this.enterTrade(config, tradeDirection);
				}
				await this.checkExitCondition(config);
				await this.orderExecution.checkPosition(this.dataProvider, config.symbol, config.timeframe);
			} catch(err) {
				console.log(err);
			}
		}
		const trades: ITrade[] = await this.orderExecution.getTrades(config.symbol);
		const perfHandler = new PerfReportHelper(this.exchange, this.startDate, new Date());
		return perfHandler.addToPerfRep(trades);
	}

	async enterTrade(config: LiveTradingConfig, tradeDirection: TradeDirection) {
		const entry: number = Candlestick.close(await this.dataProvider.getOhlcv(config.symbol, config.timeframe));
		// check if there is a position in the other direction open
		const oldPosition: FuturePosition | undefined = await this.orderExecution.getPosition(config.symbol);
		if(oldPosition) {
			if(oldPosition.tradeDirection != tradeDirection) {
				await this.orderExecution.closePosition(config.symbol, entry);
			} else {
				// if there is already a position in the same direction do nothing
				return;
			}
		} 
		// enter trade
		const stopLosses: LimitOrder[] = await config.strategy.getStopLoss(this.dataProvider, entry, tradeDirection);
		const targets: LimitOrder[] = await config.strategy.getTarget(this.dataProvider, entry, tradeDirection);

		const amount: number = PositionSize.calculate(await this.orderExecution.getBalance(), entry, stopLosses);

		this.scaleUpLimitOrder(targets, amount);
		this.scaleUpLimitOrder(stopLosses, amount);

		await this.orderExecution.createPosition({
			symbol: config.symbol,
			price: entry,
			buyOrderType: 'market',
			amount,
			tradeDirection,
			breakEvenPrice: entry,
			stopLosses,
			profitTargets: targets
		})
	}

	scaleUpLimitOrder(orders: LimitOrder[], amount: number) {
		for(let i = 0; i < orders.length; i++) {
			orders[i].amount *= amount;
		}
	}

	async checkExitCondition(config: LiveTradingConfig) {
		const data = await this.exchange.fetchOHLCV(config.symbol, config.timeframe);
		const position = await this.orderExecution.getPosition(config.symbol);
		if(position) {
			if(await config.strategy.checkExit(this.dataProvider, position.tradeDirection)) {
				await this.orderExecution.closePosition(config.symbol, Candlestick.close(data));
			}
		}
	}

	
}