import { Exchange, OHLCV } from "ccxt";
import { cloneDeep } from "lodash";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { ManagementType, ManagePosition } from "../Models/ManagePosition-interface";
import { PerformanceReport } from "../Models/PerformanceReport-model";
import { IStrategy } from "../Models/Strategy-interface";
import { ManageDefaultPosition } from "../Orders/ManageDefaultPosition";
import { ManageFixedBarExit } from "../Orders/ManageFixedBarExit";
import { StopLoss } from "../Orders/StopLoss";
import { BacktestConfig, Backtesting } from "./Backtesting";
import { ExitTestStrategy } from "./ExitTestStrategy";

const FIXED_BAR_EXIT = 12;
const WAITING_BARS_ENTRY = 50;

export interface TestingPipelineResult {
	individualReport?: PerformanceReport;
	normalTestReport?: PerformanceReport;
	ignoreNewReport?: PerformanceReport;
	classicReport?: PerformanceReport;
	entryReport?: PerformanceReport;
	exitReport?: PerformanceReport;
}

export class TestingPipeline {
	constructor(
		private exchange: Exchange,
	) {}

	async start(config: BacktestConfig, manage: ManagePosition, managementType: ManagementType) {
		const results: TestingPipelineResult = {}
		// Test each Trade individually 
		const individualTests = new Backtesting(this.exchange, new ManageDefaultPosition(), ManagementType.NORMAL_INDIVIDUAL);
		config.strategy.getStopLossTarget = async (data: OHLCV[], entryPrice: number, direction: TradeDirection) => StopLoss.defaultAtr(data, entryPrice, direction);
		results.individualReport = await individualTests.start(config);

		// Exit existing position if new Trade would be started
		const normalTests = new Backtesting(this.exchange, new ManageDefaultPosition(), ManagementType.NORMAL);
		config.strategy.getStopLossTarget = async (data: OHLCV[], entryPrice: number, direction: TradeDirection) => StopLoss.defaultAtr(data, entryPrice, direction);
		results.normalTestReport = await normalTests.start(config);

		// Stay in position even if new Trades signals would come in only enter if in no position
		const ignoreNewTests = new Backtesting(this.exchange, new ManageDefaultPosition(), ManagementType.IGNORE_NEW_TRADES);
		config.strategy.getStopLossTarget = async (data: OHLCV[], entryPrice: number, direction: TradeDirection) => StopLoss.defaultAtr(data, entryPrice, direction);
		results.ignoreNewReport = await ignoreNewTests.start(config);

		// the intended backtest
		if(!(manage instanceof ManageDefaultPosition)) {
			const backtest = new Backtesting(this.exchange, manage, managementType);
			results.classicReport = await backtest.start(config);
		}

		// check the entry isolated
		const entryTest = new Backtesting(this.exchange, new ManageFixedBarExit(FIXED_BAR_EXIT), ManagementType.ENTRY_TESTING);
		results.entryReport = await entryTest.start(config);

		// check the exit condition isolated
		const exitTesting = new Backtesting(this.exchange, manage, managementType);
		const exitConfig = cloneDeep(config);
		const exitStrat: ExitTestStrategy = new ExitTestStrategy(config.strategy.usesDynamicExit, WAITING_BARS_ENTRY);
		exitStrat.getStopLossTarget = config.strategy.getStopLossTarget;
		exitStrat.dynamicExit = config.strategy.dynamicExit;
		exitConfig.strategy = exitStrat;
		results.exitReport = await exitTesting.start(exitConfig);

		return results;
	}
}