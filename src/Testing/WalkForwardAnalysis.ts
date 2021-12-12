import { Exchange } from "ccxt";
import { cloneDeep } from "lodash";
import { timeToNumber } from "../Consts/Timeframe";
import { Database } from "../Database/Database";
import { WalkForwardResultHelper } from "../helpers/WalkForwardResultHelper";
import { PerformanceReport } from "../Models/PerformanceReport-model";
import { IResultChecking } from "../Models/ResultChecking-interface";
import { BacktestConfig, OptimizationConfig, TestSegment, WalkForwardConfig } from "../Models/TestingConfigs-inteface";
import { WalkForwardResult, WalkForwardWindow } from "../Models/WalkForwardResult-interface";
import { Backtesting } from "./Backtesting";
import { OptimizationResult, Optimizing } from "./Optimizing";



export class WalkForwardAnalysis {
	constructor(
		private exchange: Exchange, 
		private resultCheck: IResultChecking,
		private db?: Database
	) {}
	
	async start(config: WalkForwardConfig): Promise<WalkForwardResult> {
		config.startDate = new Date(config.startDate.getTime() - config.startDate.getTime() % timeToNumber(config.timeframe));
		config.endDate = new Date(config.endDate.getTime() - config.endDate.getTime() % timeToNumber(config.timeframe)); 

		let testSegments: TestSegment[] = this.createTestSegments(config);
		
		const defaultParams: number[] = config.strategy.getDefaultParams();

		const optimization = new Optimizing(this.exchange, this.resultCheck);
		const backtest = new Backtesting(this.exchange, this.resultCheck);
		
		const optimizationConfig: OptimizationConfig = cloneDeep(config);
		const backtestConfig: BacktestConfig = Object.assign({}, cloneDeep(config), {strategies: [config.strategy]});

		const result: WalkForwardWindow[] = [];

		for(let segment of testSegments) {
			try{
				console.log('Segements: optimization:', segment.optimization, 'backtest:', segment.test);
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
					betterThanDefault = true;
				} 

				let backtestMoreThanMinTrades: boolean | undefined = undefined;
				if(config.minTradesDone) {
					const minTradesDone: number = config.minTradesDone;
					backtestMoreThanMinTrades = backtestResult.allTrades.trades.length > minTradesDone;
				}
				
				const performanceDiff = backtestOptFun / optOptFun;
				result.push({betterThanDefault, performanceDiff, optimization: optResult, test: backtestResult, backtestMoreThanMinTrades})
			} catch(err) {
				console.log('error:', err);
				// repeat the walk forward segement
				testSegments.unshift(segment);
			}
		}
		const res = WalkForwardResultHelper.check(result);
		if(this.db) {
			await this.db.setCurrWfaResult(res);
		}
		return res;
	}


	private createTestSegments(config: WalkForwardConfig): TestSegment[] {
		if(config.testSegments) {
			return config.testSegments;
		}

		const windowLength = config.numOfStages + 1 / config.backtestToOptRatio;

		const timePerPeriod = (config.endDate.getTime() - config.startDate.getTime()) / windowLength;

		const optimizationTime = timePerPeriod * (1 / config.backtestToOptRatio);
		const backtestTime = timePerPeriod;

		const testSegments: TestSegment[] = [];
		for(let currDate = config.startDate.getTime(); currDate < config.endDate.getTime() - optimizationTime; currDate += backtestTime) {
			let endOfOptimization = currDate + optimizationTime;
			if(endOfOptimization > config.endDate.getTime()) {
				endOfOptimization = config.endDate.getTime();
			}
			
			let endOfBacktest = endOfOptimization + backtestTime;
			if(endOfBacktest > config.endDate.getTime()) {
				endOfBacktest = config.endDate.getTime();
			}

			testSegments.push({
				optimization: {
					startDate: new Date(currDate - currDate % timeToNumber(config.timeframe)), 
					endDate: new Date(endOfOptimization - endOfOptimization % timeToNumber(config.timeframe))
				},
				test: {
					startDate: new Date(endOfOptimization - endOfOptimization % timeToNumber(config.timeframe)),
					endDate: new Date(endOfBacktest - endOfBacktest% timeToNumber(config.timeframe))
				}
			});
		}
		return testSegments;
	}
}