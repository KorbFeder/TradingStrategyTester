import { Exchange, OHLCV } from "ccxt";
import { cloneDeep } from "lodash";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { Database } from "../Database/Database";
import { IDataProvider } from "../Models/DataProvider-interface";
import { HistoricTradesFetcher} from "../Models/HistoricTradesFetcher-interface";
import { ManagementType, ManagePosition } from "../Models/ManagePosition-interface";
import { PerformanceReport } from "../Models/PerformanceReport-model";
import { IResultChecking } from "../Models/ResultChecking-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { ManageDefaultPosition } from "../Orders/ManageDefaultPosition";
import { ManageFixedBarExit } from "../Orders/ManageFixedBarExit";
import { StopLoss } from "../Orders/StopLoss";
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

//export class TestingPipeline {
//	constructor(
//		private exchange: Exchange,
//		private dataProvider?: HistoricTradesFetcher
//	) {}
//
//	async start(config: BacktestConfig, resultChecking: IResultChecking) {
//		const promises: Promise<PerformanceReport>[] = [];
//
//		promises.push(this.defaultTest(config, new IndividualPositionCheck()));
//		promises.push(this.defaultTest(config, new NormalCheck()));
//		promises.push(this.defaultTest(config, new IgnoreNewTradesCheck()))
//
//		// the intended backtest
//		const backtest = new Backtesting(this.exchange,resultChecking);
//		promises.push(backtest.start(config));
//
//		// check the entry isolated
//		const entryTest = new Backtesting(this.exchange, new EntryCheck(FIXED_BAR_EXIT));
//		promises.push(entryTest.start(config));
//
//		// check the exit condition isolated
//		promises.push(this.exitTest(config, resultChecking));
//		return await Promise.all(promises);
//	}
//
//	private defaultTest(config: BacktestConfig, resultCheck: IResultChecking): Promise<PerformanceReport> {
//		const individualTests = new Backtesting(this.exchange, resultCheck);
//		config.strategy.getStopLoss = async (dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection) => StopLoss.defaultAtr(await dataProvider.getOhlcv(config.symbol, config.timeframe), entryPrice, tradeDirection).stops;
//		config.strategy.getTarget = async (dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection) => StopLoss.defaultAtr(await dataProvider.getOhlcv(config.symbol, config.timeframe), entryPrice, tradeDirection).targets;
//		return individualTests.start(config);
//	}
//
//	private exitTest(config: BacktestConfig, resultCheck: IResultChecking): Promise<PerformanceReport> {
//		const exitTesting = new Backtesting(this.exchange, resultCheck);
//		const exitConfig = cloneDeep(config);
//		const exitStrat: ExitTestStrategy = new ExitTestStrategy(config.symbol, config.timeframe, WAITING_BARS_ENTRY);
//		exitStrat.getStopLoss = config.strategy.getStopLoss;
//		exitStrat.checkExit = config.strategy.checkExit;
//		exitConfig.strategy = exitStrat;
//		return exitTesting.start(exitConfig);
//	}
//}