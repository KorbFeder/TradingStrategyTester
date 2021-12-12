import { Exchange } from "ccxt";
import { cloneDeep, range, result } from "lodash";
import { reporters } from "mocha";
import { userInfo } from "os";
import { report } from "process";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";
import { DataCache } from "../Database/DataCache";
import { PerfReportHelper } from "../helpers/PerfReportHelper";
import { HistoricTradesFetcher} from "../Models/HistoricTradesFetcher-interface";
import { PerformanceReport, SinglePerformanceReport } from "../Models/PerformanceReport-model";
import { IResultChecking } from "../Models/ResultChecking-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { BacktestConfig, OptimizationConfig } from "../Models/TestingConfigs-inteface";
import { Backtesting } from "./Backtesting";

export interface OptimizationParameters {
	startValue: number;
	endValue: number;
	stepValue: number;
}

export interface IndividualPerfResult {
	result: PerformanceReport; 
	params: number[];
}

export interface OptimizationResult {
	individual: IndividualPerfResult[]
	percentageProfitable: number;
}

export class Optimizing {
	constructor(
		private exchange: Exchange, 
		private resultCheck: IResultChecking, 
	) {}


	async start(config: OptimizationConfig): Promise<OptimizationResult> {
		const backtest = new Backtesting(this.exchange, this.resultCheck);

		config.startDate = new Date(config.startDate.getTime() - config.startDate.getTime() % timeToNumber(config.timeframe));
		config.endDate = new Date(config.endDate.getTime() - config.endDate.getTime() % timeToNumber(config.timeframe)); 


		const optimizationParams = config.strategy.getParams();
		if(optimizationParams.length < 1) {
			return {individual: [], percentageProfitable: 0};
		}

		
		const params = optimizationParams.map(opt => range(opt.startValue, opt.endValue + opt.stepValue, opt.stepValue))
		const combinations = this.cartesian(...params);

		const strategies: IStrategy[] = [];

		for(let parameters of combinations) {
			config.strategy.setParams(parameters);
			strategies.push(cloneDeep(config.strategy));
		}

		const backtestConfig: BacktestConfig = {
			symbol: config.symbol, 
			timeframe: config.timeframe, 
			startDate: config.startDate,
			slippage: config.slippage, 
			minBarsForIndicator: config.minBarsForIndicator, 
			includeComissions: config.includeComissions, 
			endDate: config.endDate, 
			barsRequiredToTrade: config.barsRequiredToTrade,
			strategies: strategies
		};

		const results: PerformanceReport[] = await backtest.start(backtestConfig); 

		let resultsParams: IndividualPerfResult[] = [];
		for(let i = 0; i < results.length; i++) {
			resultsParams.push({result: results[i], params: combinations[i]})
		}

		resultsParams = this.sortBestResults(config, resultsParams);
		
		return {percentageProfitable: this.checkResult(results), individual: resultsParams.slice(0, config.keepBestNResults ? config.keepBestNResults : resultsParams.length)};
	}

	private cartesian = (...a: any) => a.reduce((a: any, b: any) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())));

	private checkResult(reports: PerformanceReport[]): number {
		const profitTrades = reports.filter(report => report.allTrades.totalNetProfit > 0).length;
		return profitTrades / reports.length;
	}

	private sortBestResults(config: OptimizationConfig, reports: IndividualPerfResult[]): IndividualPerfResult[] {
		// if a minimum required trade count is specified, check if enough trades where done
		if(config.minTradesDone) {
			const minTrades: number = config.minTradesDone;
			reports = reports.filter(report => report.result.allTrades.trades.length > minTrades)
		}
		if(config.useNeighbours) {
			const distance = config.useNeighbours;
			const reportsWithAvgNigh: {avgProfit: number, individualPerfReslut: IndividualPerfResult}[] = [];
			for(let report of reports) {
				const nighbourParams: number[][] = this.cartesian(...report.params.map(param => range(param - distance, param + distance + 1, 1)));
				let nighbours: IndividualPerfResult[] = [];
				for(let param of nighbourParams) {
					nighbours = nighbours.concat(reports.filter(rep => rep.params[0] == param[0] && rep.params[1] == param[1]));
				}
				reportsWithAvgNigh.push({avgProfit: nighbours.map(nigh => nigh.result.allTrades.totalNetProfit).reduce((prev, curr) => prev + curr) / nighbours.length, individualPerfReslut: report});
			}
			reportsWithAvgNigh.sort((b, a) => a.avgProfit - b.avgProfit);
			return reportsWithAvgNigh.map(rep => rep.individualPerfReslut);
		} else {
			const rep = cloneDeep(reports);
			rep.sort((b, a) => {
				const bParam = b.result.allTrades[config.optimizationFunction];
				return a.result.allTrades[config.optimizationFunction] as number - (bParam ? bParam as number : 0);  
			});
			return rep;
		}
	}
}