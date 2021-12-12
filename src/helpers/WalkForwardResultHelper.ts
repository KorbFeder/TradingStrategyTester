import { some } from "lodash";
import { WalkForwardResult, WalkForwardWindow } from "../Models/WalkForwardResult-interface";

export class WalkForwardResultHelper {
	static check(walkForwardWindows: WalkForwardWindow[]): WalkForwardResult {
		// all performance metrics have to look good in order for the strategy to have potential
		return {
			window: walkForwardWindows,
			overallProfitability: this.overallProfitability(walkForwardWindows), 
			walkForwardRobustness: this.walkForwardRobustness(walkForwardWindows),
			consistencyOfProfits: this.consistencyOfProfits(walkForwardWindows), 
			distributionOfProfits: this.distributionOfProfits(walkForwardWindows),
			maximumDrawdown: this.maximumDrawdown(walkForwardWindows),
			betterThanDefault: this.betterThanDefault(walkForwardWindows),
			optimizationsProfitable: this.optimizationsProfitable(walkForwardWindows),
			goodPerformance: this.goodPerformance(walkForwardWindows),
			key: this.checkAll(walkForwardWindows)
		};
	}

	static checkAll(walkForwardWindows: WalkForwardWindow[]): boolean {
		return this.overallProfitability(walkForwardWindows) && this.walkForwardRobustness(walkForwardWindows) &&
			this.consistencyOfProfits(walkForwardWindows) && this.distributionOfProfits(walkForwardWindows) &&
			this.maximumDrawdown(walkForwardWindows) && this.betterThanDefault(walkForwardWindows) && 
			this.optimizationsProfitable(walkForwardWindows) && this.goodPerformance(walkForwardWindows);
	
	}

	// combined tradingresults have to be in profit
	private static overallProfitability(walkForwardWindows: WalkForwardWindow[]): boolean {
		let totalProfits = 0;
		for(const window of walkForwardWindows) {
			totalProfits += window.test.allTrades.totalNetProfit;
		}
		return totalProfits > 0;
	}

	// Walk Forward Efficiency of bigger than 50%
	private static walkForwardRobustness(walkForwardWindows: WalkForwardWindow[]): boolean {
		let optAllDaily: number = 0;
		let backtestAllDaily: number = 0;
		for(const window of walkForwardWindows) {
			const optEndDate: number = window.optimization.individual[0].result.allTrades.endDate.getTime();
			const optStartDate: number = window.optimization.individual[0].result.allTrades.startDate.getTime();
			const optDays: number = Math.round((optEndDate-optStartDate)/(1000*60*60*24));
			const optDailyProfit: number = window.optimization.individual[0].result.allTrades.totalNetProfit / optDays;
			optAllDaily += optDailyProfit;
			
			const backtestEndDate: number = window.test.allTrades.endDate.getTime();
			const backtestStartDate: number = window.test.allTrades.startDate.getTime();
			const backtestDays: number = Math.round((backtestEndDate-backtestStartDate)/(1000*60*60*24));
			const backtestDailyProfit: number = window.optimization.individual[0].result.allTrades.totalNetProfit / backtestDays;
			backtestAllDaily += backtestDailyProfit;	
		}
		const optAvgDailyProfit = optAllDaily / walkForwardWindows.length;
		const backtestAvgDailyProfit = backtestAllDaily / walkForwardWindows.length;

		const walkForwardEfficiency = backtestAvgDailyProfit / optAvgDailyProfit
		return walkForwardEfficiency > 0.5;
	}

	// %50 or more of the tests have to be in profit
	private static consistencyOfProfits(walkForwardWindows: WalkForwardWindow[]): boolean {
		let profitableCount = 0;
		for(const window of walkForwardWindows) {
			if(window.test.allTrades.totalNetProfit > 0) {
				profitableCount++;
			}
		}
		return (profitableCount / walkForwardWindows.length) > 50;
	}

	// no signle run is allowed to make more than 50% of the overall profits
	private static distributionOfProfits(walkForwardWindows: WalkForwardWindow[]): boolean {
		let totalProfits = 0;
		for(const window of walkForwardWindows) {
			totalProfits += window.test.allTrades.totalNetProfit;
		}
		return !walkForwardWindows.some(window => (window.test.allTrades.totalNetProfit / totalProfits) > 0.5);
	}

	// no maximum Drawdown exceeds 40% during any single run
	private static maximumDrawdown(walkForwardWindows: WalkForwardWindow[]): boolean {
		return !walkForwardWindows.some(window => window.test.allTrades.maxDrawdown / window.optimization.individual[0].result.allTrades.totalNetProfit > 60);
	}

	// at least 50% of the optimized runs are better than the default params in out of sample data
	private static betterThanDefault(walkForwardWindows: WalkForwardWindow[]): boolean {
		let betterThanDefCount = 0;
		for(const window of walkForwardWindows) {
			if(window.betterThanDefault) {
				betterThanDefCount++;
			}
		}
		return (betterThanDefCount / walkForwardWindows.length) > 0.5;
	}

	// at least 50% of the optimizations are profitable (have profits in  more than 50% cases)
	private static optimizationsProfitable(walkForwardWindows: WalkForwardWindow[]) {
		let profitableCount = 0;
		for(const window of walkForwardWindows) {
			if(window.optimization.percentageProfitable > 0.5) {
				profitableCount++;
			}
		}
		return (profitableCount / walkForwardWindows.length) > 0.5;
	}

	// at least 50% of the oos tests have at least a 50% performance to in sample data
	private static goodPerformance(walkForwardWindows: WalkForwardWindow[]) {
		let goodPerfCount = 0;
		for(const window of walkForwardWindows) {
			if(window.performanceDiff > 0.5) {
				goodPerfCount++
			}
		}
		return (goodPerfCount / walkForwardWindows.length) > 0.5;
	}
}