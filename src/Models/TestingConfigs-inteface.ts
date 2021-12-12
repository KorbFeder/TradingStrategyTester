import { Timeframe } from "../Consts/Timeframe";
import { SinglePerformanceReport } from "./PerformanceReport-model";
import { IStrategy } from "./Strategy-interface";

export interface TestConfig {
	startDate: Date;
	endDate: Date;
	symbol: string;
	timeframe: Timeframe;
	// splitting the fetched data into chunks, as well as the trades for equity curve and sharpe ratio
	slippage?: number;
	includeComissions?: boolean;
	// minium bars to trade, for indicator to calculate the value
	minBarsForIndicator?: number;
	barsRequiredToTrade?: number;
}

export interface BacktestConfig extends TestConfig {
	strategies: IStrategy[];
}

export interface OptimizationConfig extends TestConfig{
	strategy: IStrategy;
	optimizationFunction: keyof SinglePerformanceReport; 
	// keeps just the N specified best results
	keepBestNResults?: number;
	// looks at the results, and their neighbours, the best result + nighbours is the chosen one
	useNeighbours?: number;
	// at least n trades have to be done
	minTradesDone?: number;
}


export interface TestSegment {
	optimization: {startDate: Date, endDate: Date};
	test: {startDate: Date, endDate: Date};
}

export interface WalkForwardConfig extends OptimizationConfig {
	// in how many walk forward windows of optimization and backtest the data is getting split
	numOfStages: number;
	// example 0.25 => backtest 1 and optimization 4 length
	backtestToOptRatio: number;
	// specify testing segments instead of peroids if this is defined this method is used
	testSegments?: TestSegment[];
}