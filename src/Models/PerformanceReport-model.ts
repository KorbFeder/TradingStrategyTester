import { ITrade } from "./TestAccount-model";

export interface PerformanceReport {
	allTrades: SinglePerformanceReport;
	longTrades: SinglePerformanceReport;
	shortTrades: SinglePerformanceReport;
}

export interface SinglePerformanceReport {
	totalNetProfit: number;
	grossProfit: number;
	grossLoss: number;
	commissions: number;
	profitFactor: number;
	maxDrawdown: number;
	sharpe: number;
	sortino: number;
	ulcer: number;
	rsquared: number;
	probability: number;

	startDate: Date;
	endDate: Date;

	percentProftiableTrades: number;
	wins: number;
	loses: number;

	avgTrade: number;
	avgWinning: number;
	avgLosing: number;
	ratioAvgWinAvgLose: number;

	maxConsecWinners: number;
	maxConsecLosers: number;
	largestWinningTrade: number;
	largestLosingTrade: number;

	avgTradesPerDay: number;
	avgTimeInMarket: number;
	avgBarsInTrade: number;
	profitPerMonth: number;
	maxTimeToRecover: number;
	longestFlatPeriod: number;

	avgMAE: number;
	avgMFE: number;
	avgETD: number;

	trades: ITrade[];
	equityCurve: {equity: number, date: Date}[];
}
