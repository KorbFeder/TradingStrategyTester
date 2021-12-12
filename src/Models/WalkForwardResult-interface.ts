import { OptimizationResult } from "../Testing/Optimizing";
import { PerformanceReport } from "./PerformanceReport-model";

export interface WalkForwardWindow {
	optimization: OptimizationResult;
	test: PerformanceReport;
	betterThanDefault: boolean;
	performanceDiff: number;
	backtestMoreThanMinTrades?: boolean;
}

export interface WalkForwardResult {
	window: WalkForwardWindow[],
	overallProfitability: boolean;
	walkForwardRobustness: boolean;
	consistencyOfProfits: boolean;
	distributionOfProfits: boolean;
	maximumDrawdown: boolean;
	betterThanDefault: boolean;
	optimizationsProfitable: boolean;
	goodPerformance: boolean;
	key: boolean;
}