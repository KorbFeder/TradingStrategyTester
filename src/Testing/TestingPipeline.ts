import { Exchange, OHLCV } from "ccxt";
import { cloneDeep } from "lodash";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { ManagementType, ManagePosition } from "../Models/ManagePosition-interface";
import { PerformanceReport } from "../Models/PerformanceReport-model";
import { IResultChecking } from "../Models/ResultChecking-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { ManageDefaultPosition } from "../Orders/ManageDefaultPosition";
import { ManageFixedBarExit } from "../Orders/ManageFixedBarExit";
import { StopLoss } from "../Orders/StopLoss";
import { BacktestConfig, Backtesting } from "./Backtesting";
import { ExitTestStrategy } from "./ExitTestStrategy";
import { EntryCheck } from "./ResultChecking/EntryCheck";
import { IgnoreNewTradesCheck } from "./ResultChecking/IgnoreNewTradesCheck";
import { IndividualPositionCheck } from "./ResultChecking/IndividualPositionCheck";
import { NormalCheck } from "./ResultChecking/NormalCheck";

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

	async start(config: BacktestConfig, resultChecking: IResultChecking) {
		const results: TestingPipelineResult = {}
		// Test each Trade individually 
		const individualTests = new Backtesting(this.exchange, new IndividualPositionCheck());
		config.strategy.getStopLossTarget = async (data: OHLCV[], entryPrice: number, direction: TradeDirection) => StopLoss.defaultAtr(data, entryPrice, direction);
		results.individualReport = await individualTests.start(config);

		// Exit existing position if new Trade would be started
		const normalTests = new Backtesting(this.exchange, new NormalCheck());
		config.strategy.getStopLossTarget = async (data: OHLCV[], entryPrice: number, direction: TradeDirection) => StopLoss.defaultAtr(data, entryPrice, direction);
		results.normalTestReport = await normalTests.start(config);

		// Stay in position even if new Trades signals would come in only enter if in no position
		const ignoreNewTests = new Backtesting(this.exchange, new IgnoreNewTradesCheck());
		config.strategy.getStopLossTarget = async (data: OHLCV[], entryPrice: number, direction: TradeDirection) => StopLoss.defaultAtr(data, entryPrice, direction);
		results.ignoreNewReport = await ignoreNewTests.start(config);

		// the intended backtest
		const backtest = new Backtesting(this.exchange, resultChecking);
		results.classicReport = await backtest.start(config);

		// check the entry isolated
		const entryTest = new Backtesting(this.exchange, new EntryCheck(FIXED_BAR_EXIT));
		results.entryReport = await entryTest.start(config);

		// check the exit condition isolated
		const exitTesting = new Backtesting(this.exchange, resultChecking);
		const exitConfig = cloneDeep(config);
		const exitStrat: ExitTestStrategy = new ExitTestStrategy(config.strategy.usesDynamicExit, WAITING_BARS_ENTRY);
		exitStrat.getStopLossTarget = config.strategy.getStopLossTarget;
		exitStrat.dynamicExit = config.strategy.dynamicExit;
		exitConfig.strategy = exitStrat;
		results.exitReport = await exitTesting.start(exitConfig);

		return results;
	}
}