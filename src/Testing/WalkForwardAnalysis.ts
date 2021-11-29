import { Exchange } from "ccxt";
import { cloneDeep } from "lodash";
import { timeToNumber } from "../Consts/Timeframe";
import { PerformanceReport } from "../Models/PerformanceReport-model";
import { IResultChecking } from "../Models/ResultChecking-interface";
import { BacktestConfig, OptimizationConfig, WalkForwardConfig } from "../Models/TestingConfigs";
import { Backtesting } from "./Backtesting";
import { OptimizationResult, Optimizing } from "./Optimizing";

export interface WalkForwardWindow {
	optimization: OptimizationResult;
	test: PerformanceReport;
	betterThanDefault: boolean;
	performanceDiff: number;
}

export interface WalkForwardResult {
	windows: WalkForwardWindow[]
}

export class WalkForwardAnalysis {
	constructor(
		private exchange: Exchange, 
		private resultCheck: IResultChecking,
	) {}
	
	async start(config: WalkForwardConfig): Promise<WalkForwardResult> {
		if(config.timeSegments) {
			return await this.useTimeSegements(config);
		} else {
			return await this.useDefaultRanges(config);
		}
	}

	private async useTimeSegements(config: WalkForwardConfig): Promise<WalkForwardResult> {
		const defaultParams: number[] = config.strategy.getDefaultParams();

		if(config.timeSegments) {
			const optimization = new Optimizing(this.exchange, this.resultCheck);
			const backtest = new Backtesting(this.exchange, this.resultCheck);

			const optimizationConfig: OptimizationConfig = cloneDeep(config);
			optimizationConfig.keepBestNResults = 1;
			const backtestConfig: BacktestConfig = Object.assign({}, cloneDeep(config), {strategies: [config.strategy]});
			const result: WalkForwardResult = {
				windows: []
			};

			for(let segment of config.timeSegments) {
				optimizationConfig.startDate = segment.optimization.startDate;
				optimizationConfig.endDate = segment.optimization.endDate;

				const optResult: OptimizationResult = await optimization.start(optimizationConfig);

				optimizationConfig.strategy.setParams(optResult.individual[0].params);
				backtestConfig.strategies[0].setParams(optResult.individual[0].params);
				backtestConfig.startDate = segment.test.startDate;
				backtestConfig.endDate = segment.test.endDate;

				const backtestResult: PerformanceReport = (await backtest.start(backtestConfig))[0];

				backtestConfig.strategies[0].setParams(defaultParams);
				const defaultBacktest: PerformanceReport = (await backtest.start(backtestConfig))[0];
				const backtestOptFun = (backtestResult.allTrades[config.optimizationFunction] ? backtestResult.allTrades[config.optimizationFunction] : 0) as number;
				const defaultOptFun = (defaultBacktest.allTrades[config.optimizationFunction] ? defaultBacktest.allTrades[config.optimizationFunction] : 0) as number;
				const optOptFun = (optResult.individual[0].result.allTrades[config.optimizationFunction]? optResult.individual[0].result.allTrades[config.optimizationFunction]: 0) as number;
				
				let betterThanDefault = false;
				if(backtestOptFun > defaultOptFun) {
					betterThanDefault = true
				} 
				
				const performanceDiff = backtestOptFun / optOptFun;
				result.windows.push({betterThanDefault, performanceDiff, optimization: optResult, test: backtestResult})
			}
			return result;
		}
		return {windows: []};
	}

	private async useDefaultRanges(config: WalkForwardConfig): Promise<WalkForwardResult> {
		const defaultParams: number[] = config.strategy.getDefaultParams();
		const optimization = new Optimizing(this.exchange, this.resultCheck);
		const backtest = new Backtesting(this.exchange, this.resultCheck);

		const optimizationConfig: OptimizationConfig = cloneDeep(config);
		optimizationConfig.keepBestNResults = 1;
		const backtestConfig: BacktestConfig = Object.assign({}, cloneDeep(config), {strategies: [config.strategy]});
		const optimizationBars = timeToNumber(config.timeframe) * config.optimizationPeriod;
		const backtestBars = timeToNumber(config.timeframe) * config.testPeriod;
		const result: WalkForwardResult = {
			windows: []
		};

		for(let currDate = config.startDate.getTime(); currDate < config.endDate.getTime(); currDate += (optimizationBars + backtestBars)) {
			// optimize the strategy on in sample data
			let endOfOptimization = currDate + optimizationBars;
			if(endOfOptimization > config.endDate.getTime()) {
				endOfOptimization = config.endDate.getTime();
			}
			optimizationConfig.startDate = new Date(currDate);
			optimizationConfig.endDate = new Date(endOfOptimization);
			const optResult: OptimizationResult = await optimization.start(optimizationConfig);

			// start with last best parameters for next iteration
			optimizationConfig.strategy.setParams(optResult.individual[0].params);
			// set the best parameters for out of sample data
			backtestConfig.strategies[0].setParams(optResult.individual[0].params);

			let endOfBacktest = endOfOptimization + backtestBars;
			if(endOfBacktest > config.endDate.getTime()) {
				endOfBacktest = config.endDate.getTime();
			}
			backtestConfig.startDate = new Date(currDate + optimizationBars);
			backtestConfig.endDate = new Date(endOfBacktest);
			const backtestResult: PerformanceReport = (await backtest.start(backtestConfig))[0];

			backtestConfig.strategies[0].setParams(defaultParams);
			const defaultBacktest: PerformanceReport = (await backtest.start(backtestConfig))[0];
			const backtestOptFun = (backtestResult.allTrades[config.optimizationFunction] ? backtestResult.allTrades[config.optimizationFunction] : 0) as number;
			const defaultOptFun = (defaultBacktest.allTrades[config.optimizationFunction] ? defaultBacktest.allTrades[config.optimizationFunction] : 0) as number;
			const optOptFun = (optResult.individual[0].result.allTrades[config.optimizationFunction]? optResult.individual[0].result.allTrades[config.optimizationFunction]: 0) as number;
			
			let betterThanDefault = false;
			if(backtestOptFun > defaultOptFun) {
				betterThanDefault = true
			} 
			
			const performanceDiff = backtestOptFun / optOptFun;
			result.windows.push({betterThanDefault, performanceDiff, optimization: optResult, test: backtestResult})
		}
		return result;
	}
}