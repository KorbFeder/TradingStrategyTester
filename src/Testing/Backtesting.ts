import { Exchange, OHLCV } from "ccxt";
import { cloneDeep, mean } from "lodash";
import { std } from "mathjs";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { fetchWithDate } from "../helpers/fetchWithDate";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { ManagePosition } from "../Models/ManagePosition-interface";
import { PerformanceReport, SinglePerformanceReport } from "../Models/PerformanceReport-model";
import { IStrategy } from "../Models/Strategy-interface";
import { ITrade } from "../Models/TestAccount-model";
import { TestAccount } from "./TestAccount";

const MIN_BARS = 256;
const TEST_DATA = 256;
const STARTING_BALANCE = 10000;

export interface BacktestConfig {
	startDate: Date;
	endDate: Date;
	symbol: string;
	timeframe: Timeframe;
	strategy: IStrategy;
	includeComissions?: boolean;
	// minium bars to trade, for indicator to calculate the value
	minBarsForIndicator?: number;
	// min size of test data after end date
	minTestDataBars?: number;
}

export class Backtesting {
    private account: TestAccount | undefined = undefined;
	private perfReport: PerformanceReport;
	private highestProfit = {short: 0, long: 0, all: 0};
	private lowestProfit = {short: Number.MAX_VALUE, long: Number.MAX_VALUE, all: Number.MAX_VALUE};

	constructor(
		private exchange: Exchange, 
        private managePosition: ManagePosition
	) {
		const singlePerfRep: SinglePerformanceReport = {
			totalNetProfit: 0,
			grossProfit: 0,
			grossLoss: 0,
			commissions: 0,
			profitFactor: 1,
			maxDrawdown: 0,
			sharpe: 1,
			sortino: 1, 
			ulcer: 0,
			rsquared: 0,
			probability: 0,

			startDate: undefined,
			endDate: undefined,

			percentProftiableTrades: 0,
			wins: 0,
			loses: 0,

			avgTrade: 0,
			avgWinning: 0,
			avgLosing: 0,
			ratioAvgWinAvgLose: 0,

			maxConsecWinners: 0,
			maxConsecLosesrs: 0,
			largestWinningTrade: 0,
			largestLosingTrade: 0,

			avgTradesPerDay: 0,
			avgTimeInMarket: 0,
			avgBarsInTrade: 0,
			profitPerMonth: 0,
			maxTimeToRecover: 0,
			longestFlatPeriod: 0,

			avgMAE: 0,
			avgMFE: 0,
			avgETD: 0
		}

		// deep cloning in case an array gets added to SinglePerformanceReport
		this.perfReport = {
			allTrades: cloneDeep(singlePerfRep),
			longTrades: cloneDeep(singlePerfRep),
			shortTrades: cloneDeep(singlePerfRep)
		}

	}

	async start(config: BacktestConfig): Promise<PerformanceReport> {
		const includeComissions: boolean = config.includeComissions ? config.includeComissions : false;
		const minBarsForIndicator: number = config.minBarsForIndicator ? config.minBarsForIndicator : MIN_BARS;
		const minTestDataBars: number = config.minTestDataBars ? config.minTestDataBars : TEST_DATA;

		this.setPerfDate(config);

		const startDateWithIndicatReq: Date = new Date(config.startDate.getTime() - timeToNumber(config.timeframe) * minBarsForIndicator);
		const endDateWithTestData: Date = new Date(config.endDate.getTime() + timeToNumber(config.timeframe) * minTestDataBars);
		const data: OHLCV[] = await fetchWithDate(this.exchange, config.symbol, config.timeframe, startDateWithIndicatReq, endDateWithTestData);
		const trades: ITrade[] = [];
		

		for(let i = minBarsForIndicator - 1; i < data.length - minTestDataBars; i++) {
			const subsample = data.slice(0, i);
			const direction: TradeDirection = await config.strategy.calculate(subsample, this.exchange, config.symbol, config.timeframe);
			const result: ITrade | undefined = await this.checkResult(data.slice(i-1, data.length), subsample, direction, config);

			if(result) {
				trades.push(result);
			}
		}

		for(let trade of trades) {
			await this.addToPerfRep(trade);
			this.calcMaxDrawdown();
		}
		this.calcProfitFactor();
		this.sharpeRatio(trades);
		return this.perfReport;
	}

	private async checkResult(confirmationData: OHLCV[], testData: OHLCV[], tradeDirection: TradeDirection, config: BacktestConfig): Promise<ITrade | undefined> {
        const buyPrice: number = confirmationData[confirmationData.length-1][Candlestick.CLOSE];
        if(tradeDirection == TradeDirection.HOLD) {
            return undefined;
        }
        if(config.strategy.usesDynamicExit) {
            const exit = await config.strategy.dynamicExit(this.exchange, config.symbol, config.timeframe, tradeDirection);
            if(exit) {
                const exitPrice = await exit.backTestExit(confirmationData);
                if(tradeDirection == TradeDirection.BUY && exitPrice != -1) {
                    // todo -> dont use close, use wicks for exits
                    if(exitPrice > buyPrice) {
                        return {tradeDirection, win: true, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol: config.symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    } else if(exitPrice < buyPrice) {
                        return {tradeDirection, win: false, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol: config.symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    }
                } else if(tradeDirection == TradeDirection.SELL && exitPrice != -1) {
                    if(exitPrice < buyPrice) {
                        return {tradeDirection, win: true, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol: config.symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    } else if(exitPrice > buyPrice) {
                        return {tradeDirection, win: false, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol: config.symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    }
                }
            } else {
                throw 'no dynamic exit specified';
            }
        } else {
            const {stops, targets} = await config.strategy.getStopLossTarget(testData, tradeDirection);
            // calcualte size of the position
			const size = 1;
            //const size = await this.account.calculatePositionSize(stops, Candlestick.close(testData));
            stops.forEach(stop => stop.amount = stop.amount * size);
            targets.forEach(target => target.amount = target.amount * size);

            const position: FuturePosition = {
                symbol: config.symbol, 
                price: Candlestick.close(testData),
                buyOrderType: 'market',
                amount: stops.map(stop => stop.amount).reduce((prev, curr) => prev + curr),
                tradeDirection,
                breakEvenPrice: Candlestick.close(testData),
                stopLosses: stops,
                profitTargets: targets,
            };
            return await this.managePosition.manage(confirmationData, position);
        }
    }

	private async addToPerfRep(trade: ITrade) {
		const fees = await this.exchange.fetchFundingFees();
		// @todo -> finer calculation of fees look at ordertype and each take profit/stop
		const allFees = fees.maker * trade.initialSize * trade.firstEntry + fees.maker * trade.initialSize * trade.exitPrice;
		if(trade.tradeDirection == TradeDirection.BUY) {
			this.perfReport.allTrades.wins += trade.win ? 1 : 0;
			this.perfReport.allTrades.loses += trade.win ? 0 : 1;
			this.perfReport.longTrades.wins += trade.win ? 1 : 0;
			this.perfReport.longTrades.loses += trade.win ? 0 : 1;

			const diff = trade.exitPrice * trade.lastSize - trade.breakEvenPrice * trade.lastSize - allFees;
			this.perfReport.longTrades.totalNetProfit += diff;
			this.perfReport.allTrades.totalNetProfit += diff;
			this.perfReport.longTrades.grossProfit += trade.win ? diff : 0;
			this.perfReport.allTrades.grossProfit += trade.win ? diff : 0;
			this.perfReport.longTrades.grossLoss += trade.win ? 0 : diff;
			this.perfReport.allTrades.grossLoss += trade.win ? 0 : diff;

		} else if(trade.tradeDirection == TradeDirection.SELL) {
			this.perfReport.allTrades.wins += trade.win ? 1 : 0;
			this.perfReport.allTrades.loses += trade.win ? 0 : 1;
			this.perfReport.shortTrades.wins += trade.win ? 1 : 0;
			this.perfReport.shortTrades.loses += trade.win ? 0 : 1;

			const diff = trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize - allFees;
			this.perfReport.shortTrades.totalNetProfit += diff;
			this.perfReport.allTrades.totalNetProfit += diff;
			this.perfReport.shortTrades.grossProfit += trade.win ? diff : 0;
			this.perfReport.allTrades.grossProfit += trade.win ? diff : 0;
			this.perfReport.shortTrades.grossLoss += trade.win ? 0 : diff;
			this.perfReport.allTrades.grossLoss += trade.win ? 0 : diff;
		}
		this.perfReport.allTrades.commissions += allFees;
		this.perfReport.shortTrades.commissions += allFees;
		this.perfReport.longTrades.commissions += allFees;
		this.perfReport.allTrades.percentProftiableTrades = this.perfReport.allTrades.grossProfit / (this.perfReport.allTrades.totalNetProfit);
		this.perfReport.longTrades.percentProftiableTrades = this.perfReport.longTrades.grossProfit / (this.perfReport.longTrades.totalNetProfit);
		this.perfReport.shortTrades.percentProftiableTrades = this.perfReport.shortTrades.grossProfit / (this.perfReport.shortTrades.totalNetProfit);
	}

	private calcProfitFactor() {
		this.perfReport.allTrades.profitFactor = this.perfReport.allTrades.grossProfit / this.perfReport.allTrades.grossLoss;
		this.perfReport.longTrades.profitFactor = this.perfReport.longTrades.grossProfit / this.perfReport.longTrades.grossLoss;
		this.perfReport.shortTrades.profitFactor = this.perfReport.shortTrades.grossProfit / this.perfReport.shortTrades.grossLoss;
	}

	private setPerfDate(config: BacktestConfig) {
		this.perfReport.allTrades.endDate = config.endDate;
		this.perfReport.allTrades.startDate = config.startDate;
		this.perfReport.shortTrades.endDate = config.endDate;
		this.perfReport.shortTrades.startDate = config.startDate;
		this.perfReport.longTrades.endDate = config.endDate;
		this.perfReport.longTrades.startDate = config.startDate;
	}

	private calcMaxDrawdown() {
		if(this.perfReport.allTrades.totalNetProfit > this.highestProfit.all) {
			this.highestProfit.all = this.perfReport.allTrades.totalNetProfit;
		}
		if(this.perfReport.longTrades.totalNetProfit > this.highestProfit.long) {
			this.highestProfit.long = this.perfReport.longTrades.totalNetProfit;
		}
		if(this.perfReport.shortTrades.totalNetProfit > this.highestProfit.short) {
			this.highestProfit.short = this.perfReport.shortTrades.totalNetProfit;
		}
		if(this.perfReport.allTrades.totalNetProfit < this.lowestProfit.all) {
			this.lowestProfit.all = this.perfReport.allTrades.totalNetProfit;
		}
		if(this.perfReport.longTrades.totalNetProfit < this.lowestProfit.long) {
			this.lowestProfit.long = this.perfReport.longTrades.totalNetProfit;
		}
		if(this.perfReport.shortTrades.totalNetProfit < this.lowestProfit.short) {
			this.lowestProfit.short = this.perfReport.shortTrades.totalNetProfit;
		}
		this.perfReport.allTrades.maxDrawdown = this.lowestProfit.all - this.highestProfit.all;
		this.perfReport.longTrades.maxDrawdown = this.lowestProfit.long - this.highestProfit.long;
		this.perfReport.shortTrades.maxDrawdown = this.lowestProfit.short - this.highestProfit.short;
	}

	private async sharpeRatio(trades: ITrade[]) {
		const fees = await this.exchange.fetchFundingFees();

		const allRois: number[] = [];
		const longRois: number[] = [];
		const shortRois: number[] = [];

		for(let trade of trades) {
			const allFees = fees.maker * trade.initialSize * trade.firstEntry + fees.maker * trade.initialSize * trade.exitPrice;
			const diff = trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize - allFees;
			const roi = diff / (trade.exitPrice * trade.initialSize);
			allRois.push(roi);
			if(trade.tradeDirection == TradeDirection.BUY) {
				longRois.push(roi);
			} else if(trade.tradeDirection == TradeDirection.SELL) {
				shortRois.push(roi);
			}
		}
		
		this.perfReport.allTrades.sharpe = mean(allRois) / std(allRois);
		this.perfReport.longTrades.sharpe = mean(longRois) / std(longRois);
		this.perfReport.shortTrades.sharpe = mean(shortRois) / std(shortRois);
	}

	//async dailyRois(trades: ITrade[], startDate: Date, endDate: Date): Promise<{allRois: number[], longRois: number[], shortRois: number[]}> {
	//	const fees = await this.exchange.fetchFundingFees();

	//	const rois: {allRois: number[], longRois: number[], shortRois: number[]} = {
	//		allRois: [],
	//		longRois: [],
	//		shortRois: [],
	//	}

	//	for(let currDate = startDate; currDate.getTime() < endDate.getTime(); currDate.setDate(currDate.getDate() + 1)) {
	//		const allThisDate = trades.filter((trade) => trade.date.getDate() == currDate.getDate() && trade.date.getMonth() == currDate.getMonth() && trade.date.getFullYear() == currDate.getFullYear());
	//		let dailyRoi = 0;
	//		let dailyRoiLong = 0;
	//		let dailyRoiShort = 0;
	//		let diff = 0;

	//		for(let trade of allThisDate) {
	//			const allFees = fees.maker * trade.initialSize * trade.firstEntry + fees.maker * trade.initialSize * trade.exitPrice;
	//			diff += trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize - allFees;

	//		}
	//		const roi = diff / (trade.exitPrice * trade.initialSize);
	//		rois.allRois.push(dailyRoi);
	//		rois.longRois.push(dailyRoiLong);
	//		rois.shortRois.push(dailyRoiShort);
	//	}
	//	return rois;
	//}
};