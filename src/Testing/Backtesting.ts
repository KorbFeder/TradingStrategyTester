import { Exchange, OHLCV } from "ccxt";
import { cloneDeep, initial, mean } from "lodash";
import { std } from "mathjs";
import { positional } from "yargs";
import { Candlestick } from "../Consts/Candlestick";
import { calcStartingTimestamp, Timeframe, timeToNumber } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { fetchWithDate } from "../helpers/fetchWithDate";
import { PerfReportHelper } from "../helpers/PerfReportHelper";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { ManagementType, ManagePosition } from "../Models/ManagePosition-interface";
import { PerformanceReport, SinglePerformanceReport } from "../Models/PerformanceReport-model";
import { IStrategy } from "../Models/Strategy-interface";
import { ITrade } from "../Models/TestAccount-model";
import { TestAccount } from "./TestAccount";

const MIN_BARS = 256;
const TEST_DATA = 256;
const STARTING_BALANCE = 10000;
const DATA_LIMIT = 500;
const BARS_REQ = 20;

export interface BacktestConfig {
	startDate: Date;
	endDate: Date;
	symbol: string;
	timeframe: Timeframe;
	strategy: IStrategy;
	slippage?: number;
	includeComissions?: boolean;
	// minium bars to trade, for indicator to calculate the value
	minBarsForIndicator?: number;
	barsRequiredToTrade?: number;
}

export class Backtesting {
    private account: TestAccount | undefined = undefined;
	private trades: ITrade[] = [];
	private currPosition: FuturePosition | undefined = undefined;

	constructor(
		private exchange: Exchange, 
        private managePosition: ManagePosition,
		private managementType: ManagementType = ManagementType.NORMAL
	) {
	}

	async start(config: BacktestConfig): Promise<PerformanceReport> {
		const minBarsForIndicator: number = config.minBarsForIndicator ? config.minBarsForIndicator : MIN_BARS;
		const barsRequiredToTrade: number = config.barsRequiredToTrade ? config.barsRequiredToTrade : 20;

		const startDateWithIndicatReq: Date = new Date(config.startDate.getTime() - timeToNumber(config.timeframe) * minBarsForIndicator);
		// @todo -> save historic data in database, so it doenst need to be fetched over and over again (rate limit makes this very slow)
		const data: OHLCV[] = await fetchWithDate(this.exchange, config.symbol, config.timeframe, startDateWithIndicatReq, config.endDate);
		this.trades = [];
		
		for(let i = minBarsForIndicator + barsRequiredToTrade + 1; i < data.length; i++) {
			const subsample = data.slice(0, i);
			const direction: TradeDirection = await config.strategy.calculate(subsample, this.exchange, config.symbol, config.timeframe, calcStartingTimestamp(config.timeframe, Candlestick.timestamp(subsample), DATA_LIMIT), DATA_LIMIT);

			switch(this.managementType) {
				case ManagementType.NORMAL:
					if(!this.managePosition.supportedManagementTypes.includes(ManagementType.NORMAL)) {
						throw "management type has be supported from MangePosition";
					}
					await this.checkPosition(data, i, direction, config);
					break;
				case ManagementType.DYNAMIC:
					if(!this.managePosition.supportedManagementTypes.includes(ManagementType.DYNAMIC)) {
						throw "management type has be supported from MangePosition";
					} 
					await this.checkPositionDynamically(data, i, direction, config);
					break;
				case ManagementType.NORMAL_INDIVIDUAL:
					if(!this.managePosition.supportedManagementTypes.includes(ManagementType.NORMAL_INDIVIDUAL)) {
						throw "management type has be supported from MangePosition";
					}
					await this.checkPositionIndividually(data, i, direction, config);
					break;
				case ManagementType.IGNORE_NEW_TRADES: 
					if(!this.managePosition.supportedManagementTypes.includes(ManagementType.IGNORE_NEW_TRADES)) {
						throw "management type has be supported from MangePosition";
					}
					await this.ignoreNewTrends(data, i, direction, config);
					break;
				case ManagementType.ENTRY_TESTING: 
					if(!this.managePosition.supportedManagementTypes.includes(ManagementType.ENTRY_TESTING)) {
						throw "management type has be supported from MangePosition";
					}
					await this.entryTesting(data, i, direction, config);
					break;
			}
		}

		// if the simulation is over and a position would still be up close it at the last close price
		this.closeLastPosition(data);

		const perfReportHelper = new PerfReportHelper(this.exchange, config);
		const report = await perfReportHelper.addToPerfRep(this.trades);
		this.trades = [];
		return report;
	}

	private async entryTesting(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig) {
		if(direction != TradeDirection.HOLD) {
			this.managePosition.reset();
			const confirmationData = data.slice(i-1, data.length-1);
			const position: FuturePosition = {
				symbol: config.symbol, 
				price: Candlestick.open(confirmationData, 1),
				buyOrderType: 'market',
				amount: 1,
				tradeDirection: direction,
				breakEvenPrice: Candlestick.open(confirmationData, 1),
				stopLosses: [],
				profitTargets: [],
			};
			this.currPosition = position;
		
			for(let data of confirmationData) {
				const result = await this.managePosition.manage(data, position);
				if(result) {
					this.trades.push(result);
					this.currPosition = undefined;
					break;
				}
			}
			// if possition couldnt be closed in confirmation data close it at the end of the data
			if(this.currPosition) {
				this.closeLastPosition(data);
			}
		}
	}

	private checkPositionDynamically(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig) {
		// @ todo -> has to beimplemented
	}

	private async ignoreNewTrends(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig) {
		if(direction != TradeDirection.HOLD) {
			// dont open a new position if there is still one active
			if(!this.currPosition) {
				this.managePosition.reset();
				const entry = Candlestick.open(data, i);
				this.managePosition.reset();
				const {stops, targets} = await config.strategy.getStopLossTarget(data.slice(0, i), entry, direction);
				this.currPosition = {
					symbol: config.symbol, 
					price: entry,
					buyOrderType: 'market',
					amount: stops.map(stop => stop.amount).reduce((prev, curr) => prev + curr),
					tradeDirection: direction,
					breakEvenPrice: entry,
					stopLosses: stops,
					profitTargets: targets,
				};
			}
		}
		if(this.currPosition) {
			const result: ITrade | undefined = await this.managePosition.manage(data[i], this.currPosition);
			if(result) {
				this.trades.push(result);
				this.currPosition = undefined;
			}
		}
	}

	private async checkPositionIndividually(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig) {
		if(direction != TradeDirection.HOLD) {
			const testData = data.slice(0, i);
			const confirmationData = data.slice(i-1, data.length-1);
			const {stops, targets} = await config.strategy.getStopLossTarget(testData, Candlestick.open(confirmationData, 1), direction);
			// calcualte size of the position
			const size = 1;
			//const size = await this.account.calculatePositionSize(stops, Candlestick.close(testData));
			stops.forEach(stop => stop.amount = stop.amount * size);
			targets.forEach(target => target.amount = target.amount * size);
			this.managePosition.reset();

			const position: FuturePosition = {
				symbol: config.symbol, 
				price: Candlestick.open(confirmationData, 1),
				buyOrderType: 'market',
				amount: stops.map(stop => stop.amount).reduce((prev, curr) => prev + curr),
				tradeDirection: direction,
				breakEvenPrice: Candlestick.open(confirmationData, 1),
				stopLosses: stops,
				profitTargets: targets,
			};
			this.currPosition = position;
		
			for(let data of confirmationData) {
				const result = await this.managePosition.manage(data, position);
				if(result) {
					this.trades.push(result);
					this.currPosition = undefined;
					break;
				}
			}
			// if possition couldnt be closed in confirmation data close it at the end of the data
			if(this.currPosition) {
				this.closeLastPosition(data);
			}
		}
	}

	private async checkPosition(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig) {
		if(direction != TradeDirection.HOLD) {
			// if there is still an position open close it at the price the new position opens
			if(this.currPosition) {
				const exitPrice = Candlestick.open(data, i);
				this.trades.push({
					initialSize: this.currPosition.amount,
					tradeDirection: this.currPosition.tradeDirection, 
					win: this.currPosition.tradeDirection == TradeDirection.BUY ? this.currPosition.price < exitPrice : this.currPosition.price > exitPrice, 
					date: new Date(Candlestick.timestamp(data, i)), 
					breakEvenPrice: this.currPosition.breakEvenPrice, 
					exitPrice, 
					lastSize: this.currPosition.amount,
					symbol: this.currPosition.symbol, 
					firstEntry: this.currPosition.price,
				});
			}
			this.managePosition.reset();
			const entry = Candlestick.open(data, i);
			const {stops, targets} = await config.strategy.getStopLossTarget(data.slice(0, i), entry, direction);
			this.currPosition = {
				symbol: config.symbol, 
				price: entry,
				buyOrderType: 'market',
				amount: stops.map(stop => stop.amount).reduce((prev, curr) => prev + curr),
				tradeDirection: direction,
				breakEvenPrice: entry,
				stopLosses: stops,
				profitTargets: targets,
			};
		}
		if(this.currPosition) {
			const result: ITrade | undefined = await this.managePosition.manage(data[i], this.currPosition);
			if(result) {
				this.trades.push(result);
				this.currPosition = undefined;
			}
		}
	}

	private closeLastPosition(data: OHLCV[], onClose: boolean = true) {
		if(this.currPosition) {
			const exitPrice = Candlestick.close(data);
			this.trades.push({
				initialSize: this.currPosition.amount,
				tradeDirection: this.currPosition.tradeDirection, 
				win: this.currPosition.tradeDirection == TradeDirection.BUY ? this.currPosition.price < exitPrice : this.currPosition.price > exitPrice, 
				date: new Date(Candlestick.timestamp(data)), 
				breakEvenPrice: this.currPosition.breakEvenPrice, 
				exitPrice, 
				lastSize: this.currPosition.amount,
				symbol: this.currPosition.symbol, 
				firstEntry: this.currPosition.price,
			});
			this.currPosition = undefined;
		}
	}
};