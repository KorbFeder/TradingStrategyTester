import { Exchange, Trade } from "ccxt";
import { cloneDeep, mean } from "lodash";
import { std } from "mathjs";
import { TradeDirection } from "../Consts/TradeDirection";
import { PerformanceReport, SinglePerformanceReport } from "../Models/PerformanceReport-model";
import { ITrade } from "../Models/TestAccount-model";
import { BacktestConfig } from "../Testing/Backtesting";
const ubique = require('ubique');

export enum SplitTimeInterval {
	MONTH = 0, DAY = 1
}

export class PerfReportHelper {
	private perfReport: PerformanceReport;

	private highestProfit = {short: 0, long: 0, all: 0};
	private lowestProfit = {short: Number.MAX_VALUE, long: Number.MAX_VALUE, all: Number.MAX_VALUE};

	private maxConsecWins = 0;
	private maxConsecLoses = 0;
	private currWinstreak = 0;
	private currLoseStreak = 0;
	private maxConsecWinsLong = 0;
	private maxConsecLosesLong = 0;
	private currWinstreakLong = 0;
	private currLoseStreakLong = 0;
	private maxConsecWinsShort = 0;
	private maxConsecLosesShort = 0;
	private currWinstreakShort = 0;
	private currLoseStreakShort = 0;

	constructor(private exchange: Exchange, private config: BacktestConfig) {
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

			startDate: new Date(config.startDate),
			endDate: new Date(config.endDate),

			percentProftiableTrades: 0,
			wins: 0,
			loses: 0,

			avgTrade: 0,
			avgWinning: 0,
			avgLosing: 0,
			ratioAvgWinAvgLose: 0,

			maxConsecWinners: 0,
			maxConsecLosers: 0,
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
			avgETD: 0,

			trades: [],
			equityCurve: []
		}

		// deep cloning in case an array gets added to SinglePerformanceReport
		this.perfReport = {
			allTrades: cloneDeep(singlePerfRep),
			longTrades: cloneDeep(singlePerfRep),
			shortTrades: cloneDeep(singlePerfRep)
		}
	}

	

	public async addToPerfRep(trades: ITrade[]): Promise<PerformanceReport> {
		this.addTrades(trades);
		for(let trade of trades) {
			await this.addTradeToPerfRep(trade);
			this.calcMaxDrawdown();
			this.calcConsecTradese(trade);
			this.calcLargestTrades(trade);
		}
		this.calcProfitFactor();
		this.avgTrades();
		this.calcAvgTradesPerDay(trades);

		this.calcProfitPerMonth(trades);
		this.sharpeRatio(trades, SplitTimeInterval.DAY);
		this.calcEquityCurve(trades);

		return this.perfReport;
	}

	private addTrades(trades: ITrade[]) {
		this.perfReport.allTrades.trades = cloneDeep(trades);
		this.perfReport.longTrades.trades = cloneDeep(trades).filter(trade => trade.tradeDirection == TradeDirection.BUY);
		this.perfReport.shortTrades.trades = cloneDeep(trades).filter(trade => trade.tradeDirection == TradeDirection.SELL);
	}

	private async addTradeToPerfRep(trade: ITrade) {
		const allFees = this.getFeesForTrade(trade);

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

			this.perfReport.longTrades.commissions += allFees;
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

			this.perfReport.shortTrades.commissions += allFees;
		}
		this.perfReport.allTrades.commissions += allFees;
		if(this.perfReport.allTrades.loses > 0)
			this.perfReport.allTrades.percentProftiableTrades = this.perfReport.allTrades.wins / (this.perfReport.allTrades.loses + this.perfReport.allTrades.wins);
		if(this.perfReport.longTrades.loses > 0)
			this.perfReport.longTrades.percentProftiableTrades = this.perfReport.longTrades.wins / (this.perfReport.longTrades.loses + this.perfReport.longTrades.wins);
		if(this.perfReport.shortTrades.loses > 0)
			this.perfReport.shortTrades.percentProftiableTrades = this.perfReport.shortTrades.wins / (this.perfReport.shortTrades.loses + this.perfReport.shortTrades.wins);
	}

	private calcProfitFactor() {
		this.perfReport.allTrades.profitFactor = this.perfReport.allTrades.grossLoss == 0 ? 99 : this.perfReport.allTrades.grossProfit / -this.perfReport.allTrades.grossLoss;
		this.perfReport.longTrades.profitFactor = this.perfReport.longTrades.grossLoss == 0 ? 99 : this.perfReport.longTrades.grossProfit / -this.perfReport.longTrades.grossLoss;
		this.perfReport.shortTrades.profitFactor = this.perfReport.shortTrades.grossLoss == 0 ? 99 : this.perfReport.shortTrades.grossProfit / -this.perfReport.shortTrades.grossLoss;
	}

	private calcConsecTradese(trade: ITrade) {
		if(trade.tradeDirection == TradeDirection.BUY) {
			if(trade.win) {
				this.currLoseStreakLong = 0;
				this.currWinstreakLong++;
				if(this.currWinstreakLong > this.maxConsecWinsLong) {
					this.maxConsecWinsLong = this.currWinstreakLong;
				}
			} else {
				this.currWinstreakLong = 0;
				this.currLoseStreakLong++;
				if(this.currLoseStreakLong > this.maxConsecLosesLong) {
					this.maxConsecLosesLong = this.currLoseStreakLong;
				}
			}
			this.perfReport.longTrades.maxConsecWinners = this.maxConsecWinsLong;
			this.perfReport.longTrades.maxConsecLosers = this.maxConsecLosesLong;
		} else if(trade.tradeDirection == TradeDirection.SELL){
			if(trade.win) {
				this.currLoseStreakShort = 0;
				this.currWinstreakShort++;
				if(this.currWinstreakShort > this.maxConsecWinsShort) {
					this.maxConsecWinsShort = this.currWinstreakShort;
				}
			} else {
				this.currWinstreakShort = 0;
				this.currLoseStreakShort++;
				if(this.currLoseStreakShort > this.maxConsecLosesShort) {
					this.maxConsecLosesShort = this.currLoseStreakShort;
				}
			}
			this.perfReport.shortTrades.maxConsecWinners = this.maxConsecWinsShort;
			this.perfReport.shortTrades.maxConsecLosers = this.maxConsecLosesShort;
		}

		if(trade.win) {
			this.currLoseStreak = 0;
			this.currWinstreak++;
			if(this.currWinstreak > this.maxConsecWins) {
				this.maxConsecWins = this.currWinstreak;
			}
		} else {
			this.currWinstreak = 0;
			this.currLoseStreak++;
			if(this.currLoseStreak > this.maxConsecLoses) {
				this.maxConsecLoses = this.currLoseStreak;
			}
		}
		this.perfReport.allTrades.maxConsecWinners = this.maxConsecWins;
		this.perfReport.allTrades.maxConsecLosers = this.maxConsecLoses;
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

	private calcEquityCurve(trades: ITrade[]) {
		const intervals: {date: Date, trades: ITrade[]}[] = this.splitTradesIntoTimeIntervals(trades, SplitTimeInterval.DAY);

		let intervalProfitAll = 0;
		let intervalProfitLong = 0;
		let intervalProfitShort = 0;

		for(let data of intervals) {
			for(let trade of data.trades) {
				const allFees = this.getFeesForTrade(trade);
				if(trade.tradeDirection == TradeDirection.BUY) {
					const diff = trade.exitPrice * trade.lastSize - trade.breakEvenPrice * trade.lastSize - allFees;
					intervalProfitLong += diff;
					intervalProfitAll += diff;

				} else if(trade.tradeDirection == TradeDirection.SELL) {
					const diff = trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize - allFees;
					intervalProfitAll += diff;
					intervalProfitShort += diff;
				}
			}
			this.perfReport.allTrades.equityCurve.push({equity: intervalProfitAll, date: data.date});
			this.perfReport.longTrades.equityCurve.push({equity: intervalProfitShort, date: data.date});
			this.perfReport.shortTrades.equityCurve.push({equity: intervalProfitLong, date: data.date});
		}
	}

	private async sharpeRatio(trades: ITrade[], splitTimeInterval: SplitTimeInterval = SplitTimeInterval.MONTH) {
		const intervals: {date: Date, trades: ITrade[]}[] = this.splitTradesIntoTimeIntervals(trades, splitTimeInterval);
		let intervalProfitsAll: number[] = [];
		let intervalProfitsLong: number[] = [];
		let intervalProfitsShort: number[] = [];

		let intervalProfitAll = 0;
		let intervalProfitLong = 0;
		let intervalProfitShort = 0;

		for(let data of intervals) {
			for(let trade of data.trades) {
				const allFees = this.getFeesForTrade(trade);
				if(trade.tradeDirection == TradeDirection.BUY) {
					const diff = trade.exitPrice * trade.lastSize - trade.breakEvenPrice * trade.lastSize - allFees;
					intervalProfitLong += diff;
					intervalProfitAll += diff;

				} else if(trade.tradeDirection == TradeDirection.SELL) {
					const diff = trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize - allFees;
					intervalProfitAll += diff;
					intervalProfitShort += diff;
				}
			}
			intervalProfitsAll.push(intervalProfitAll);
			intervalProfitsLong.push(intervalProfitLong);
			intervalProfitsShort.push(intervalProfitShort);
		}

		this.perfReport.allTrades.sharpe = this.perfReport.allTrades.profitPerMonth / std(intervalProfitsAll);
		this.perfReport.longTrades.sharpe = this.perfReport.longTrades.profitPerMonth / std(intervalProfitsLong);
		this.perfReport.shortTrades.sharpe = this.perfReport.shortTrades.profitPerMonth / std(intervalProfitsShort);
	}

	private avgTrades() {
		const avgs = (report: SinglePerformanceReport) => {
			if((report.wins + report.loses) != 0)
				report.avgTrade = report.totalNetProfit / (report.wins + report.loses);
			if(report.loses != 0)
				report.avgLosing = report.grossLoss / report.loses;
			if(report.wins != 0)
				report.avgWinning = report.grossProfit / report.wins;
			if(report.avgLosing != 0)
				report.ratioAvgWinAvgLose = report.avgWinning / -report.avgLosing;
			return report;
		}

		this.perfReport.allTrades = avgs(this.perfReport.allTrades);
		this.perfReport.longTrades = avgs(this.perfReport.longTrades);
		this.perfReport.shortTrades = avgs(this.perfReport.shortTrades);

	}

	private splitTradesIntoTimeIntervals(trades: ITrade[], splitInterval: SplitTimeInterval = SplitTimeInterval.DAY): {date: Date, trades: ITrade[]}[] {
		// create an initalized array of all the dates between start and end date of the backtest
		let dateIntervals: {date: Date, trades: ITrade[]}[] = [];
		let startDateHours =new Date(this.config.startDate);
		startDateHours.setUTCMinutes(0, 0, 0);
		let startDateMonth = new Date(startDateHours);
		startDateMonth.setUTCDate(1);

		let endDateHours: Date = new Date(this.config.endDate);
		endDateHours.setUTCMinutes(0, 0, 0);
		let endDateMonths: Date = new Date(this.config.endDate);
		endDateMonths.setUTCHours(0, 0, 0, 0);
		endDateHours.setUTCHours(endDateHours.getUTCHours() + 1); 
		endDateMonths.setUTCMonth(endDateMonths.getUTCMonth() + 1);

		switch(splitInterval) {
			case SplitTimeInterval.DAY: 
				for(; startDateHours <= endDateHours; startDateHours.setUTCDate(startDateHours.getUTCDate()+1)){
					dateIntervals.push({date: new Date(startDateHours), trades: []});
				}
				break;
			case SplitTimeInterval.MONTH:
				for(; startDateMonth <= endDateMonths; startDateMonth.setUTCMonth(startDateMonth.getUTCMonth() + 1)) {
					dateIntervals.push({date: new Date(startDateMonth), trades: []});
				}
				break;
		}

		// sort each trade into a timeinterval where it exited the trade
		for(let trade of trades) {
			for(let i = 0; i < dateIntervals.length - 1; i++) {
				if(trade.date > dateIntervals[i].date && trade.date < dateIntervals[i+1].date) {
					dateIntervals[i].trades.push(trade);
					break;
				}
			}
		}
		dateIntervals.pop();
		return dateIntervals;
	}

	private calcAvgTradesPerDay(trades: ITrade[]) {
		const intervals: {date: Date, trades: ITrade[]}[] = this.splitTradesIntoTimeIntervals(trades, SplitTimeInterval.DAY);
		this.perfReport.allTrades.avgTradesPerDay = (this.perfReport.allTrades.wins + this.perfReport.allTrades.loses) / intervals.length;
		this.perfReport.longTrades.avgTradesPerDay = (this.perfReport.longTrades.wins + this.perfReport.longTrades.loses) / intervals.length;
		this.perfReport.shortTrades.avgTradesPerDay = (this.perfReport.shortTrades.wins + this.perfReport.shortTrades.loses) / intervals.length;
	}

	private calcProfitPerMonth(trades: ITrade[]) {
		const month = 30.5;
		const cumProf = this.cumulativeProfit(trades);
		const oneDay = 1000 * 60 * 60 * 24;
		const dataLength = (month / Math.round(Math.abs((this.config.startDate.getTime() - this.config.endDate.getTime()) / oneDay)));

		this.perfReport.allTrades.profitPerMonth = cumProf.cumAll * dataLength;
		this.perfReport.longTrades.profitPerMonth = cumProf.cumLong * dataLength;
		this.perfReport.shortTrades.profitPerMonth = cumProf.cumShort * dataLength;
	}

	private getFeesForTrade(trade: ITrade): number {
		// @todo -> maybe use real fees used by the exchange
		const fees = this.exchange.markets[trade.symbol]['taker'];
		// @todo -> finer calculation of fees look at ordertype and each take profit/stop
		let allFees = 0;
		if(this.config.includeComissions != undefined && this.config.includeComissions == true) {
			allFees = fees * trade.initialSize * trade.firstEntry + fees * trade.initialSize * trade.exitPrice;
		}
		return allFees;
	}

	private calcLargestTrades(trade: ITrade) {
		const allFees = this.getFeesForTrade(trade);
		if(trade.tradeDirection == TradeDirection.BUY) {
			const diff = trade.exitPrice * trade.lastSize - trade.breakEvenPrice * trade.lastSize - allFees;
			// only longs
			if(diff > this.perfReport.longTrades.largestWinningTrade) {
				this.perfReport.longTrades.largestWinningTrade = diff;
			} 
			if(diff < this.perfReport.longTrades.largestLosingTrade) {
				this.perfReport.longTrades.largestLosingTrade = diff;
			}

			// all trades 
			if(diff > this.perfReport.allTrades.largestWinningTrade) {
				this.perfReport.allTrades.largestWinningTrade = diff;
			} 
			if(diff < this.perfReport.allTrades.largestLosingTrade) {
				this.perfReport.allTrades.largestLosingTrade = diff;
			}
		} else if(trade.tradeDirection == TradeDirection.SELL) {
			const diff = trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize - allFees;
			// only shorts
			if(diff > this.perfReport.shortTrades.largestWinningTrade) {
				this.perfReport.shortTrades.largestWinningTrade = diff;
			}
			if(diff < this.perfReport.shortTrades.largestLosingTrade) {
				this.perfReport.shortTrades.largestLosingTrade = diff;
			}

			// all trades
			if(diff > this.perfReport.allTrades.largestWinningTrade) {
				this.perfReport.allTrades.largestWinningTrade = diff;
			}
			if(diff < this.perfReport.allTrades.largestLosingTrade) {
				this.perfReport.allTrades.largestLosingTrade = diff;
			}
		}
	}

	private cumulativeProfit(trades: ITrade[]): {cumAll: number, cumLong: number, cumShort: number} {
		let cumAll = 0;
		let cumLong = 0;
		let cumShort = 0;
		const point = 1;
		for(let trade of trades) {
			const allFees = this.getFeesForTrade(trade);
			if(trade.tradeDirection == TradeDirection.BUY) {
				const diff = trade.exitPrice * trade.lastSize - trade.breakEvenPrice * trade.lastSize - allFees;
				cumAll += diff * trade.initialSize * point;	
				cumLong += diff * trade.initialSize * point;	
			} else if(trade.tradeDirection == TradeDirection.SELL) {
				const diff = trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize - allFees;
				cumAll += diff * trade.initialSize * point;	
				cumShort += diff * trade.initialSize * point;	
			}
		}
		return {cumAll, cumLong, cumShort};
	}
}

