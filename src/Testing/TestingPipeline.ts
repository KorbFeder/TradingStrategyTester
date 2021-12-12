import { Exchange, OHLCV } from "ccxt";
import { cloneDeep, result } from "lodash";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { Database } from "../Database/Database";
import { WalkForwardResultHelper } from "../helpers/WalkForwardResultHelper";
import { IDataProvider } from "../Models/DataProvider-interface";
import { HistoricTradesFetcher} from "../Models/HistoricTradesFetcher-interface";
import { ManagePosition } from "../Models/ManagePosition-interface";
import { PerformanceReport } from "../Models/PerformanceReport-model";
import { IResultChecking } from "../Models/ResultChecking-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { BacktestConfig, WalkForwardConfig } from "../Models/TestingConfigs-inteface";
import { WalkForwardResult, WalkForwardWindow } from "../Models/WalkForwardResult-interface";
import { ManageDefaultPosition } from "../Orders/ManageDefaultPosition";
import { ManageFixedBarExit } from "../Orders/ManageFixedBarExit";
import { StopLoss } from "../Orders/StopLoss";
import { Backtesting } from "./Backtesting";
import { ExitTestStrategy } from "./ExitTestStrategy";
import { EntryCheck } from "./ResultChecking/EntryCheck";
import { IgnoreNewTradesCheck } from "./ResultChecking/IgnoreNewTradesCheck";
import { IndividualPositionCheck } from "./ResultChecking/IndividualPositionCheck";
import { NormalCheck } from "./ResultChecking/NormalCheck";
import { WalkForwardAnalysis } from "./WalkForwardAnalysis";

const FIXED_BAR_EXIT = 12;
const WAITING_BARS_ENTRY = 50;
const MIN_TRADES = 100;

export interface TestingPipelineResults {
	perlimPercentageProfitable: number;
	walkForwardResult: WalkForwardResult;
}

export class TestingPipeline {
	constructor(
		private exchange: Exchange,
		private resultChecking: IResultChecking,
		private db?: Database
	) {}

	async start(config: WalkForwardConfig): Promise<TestingPipelineResults> {
		//const prelimConfig: BacktestConfig = Object.assign({}, cloneDeep(config), {strategies: [config.strategy]});
		//const prelimTesting: PerformanceReport[] = await this.preliminaryTesting(prelimConfig);
		//let profitableCount = 0;

		//for(const report of prelimTesting) {
		//	if(report.allTrades.totalNetProfit > 0) {
		//		profitableCount++;
		//	}			
		//}

		//const perlimPercentageProfitable = profitableCount / prelimTesting.length;
		const walkForward = new WalkForwardAnalysis(this.exchange, this.resultChecking, this.db);
		const walkForwardResult: WalkForwardResult = await walkForward.start(config);

		return {perlimPercentageProfitable: 0, walkForwardResult};
	}

	private async defaultTest(config: BacktestConfig, resultCheck: IResultChecking): Promise<PerformanceReport> {
		const individualTests = new Backtesting(this.exchange, resultCheck);
		config.strategies[0].getStopLoss = async (dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection) => StopLoss.defaultAtr(await dataProvider.getOhlcv(config.symbol, config.timeframe), entryPrice, tradeDirection).stops;
		config.strategies[0].getTarget = async (dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection) => StopLoss.defaultAtr(await dataProvider.getOhlcv(config.symbol, config.timeframe), entryPrice, tradeDirection).targets;
		return (await individualTests.start(config))[0];
	}

	private async exitTest(config: BacktestConfig, resultCheck: IResultChecking): Promise<PerformanceReport> {
		const exitTesting = new Backtesting(this.exchange, resultCheck);
		const exitConfig = cloneDeep(config);
		const exitStrat: ExitTestStrategy = new ExitTestStrategy(config.symbol, config.timeframe, WAITING_BARS_ENTRY);
		exitStrat.getStopLoss = config.strategies[0].getStopLoss;
		exitStrat.checkExit = config.strategies[0].checkExit;
		exitConfig.strategies[0] = exitStrat;
		return (await exitTesting.start(exitConfig))[0];
	}

	async preliminaryTesting(config: BacktestConfig): Promise<PerformanceReport[]> {
		const individualReport: PerformanceReport = await this.defaultTest(config, new IndividualPositionCheck());
		console.log('individualReport done')
		const normalTestReport: PerformanceReport = await this.defaultTest(config, new NormalCheck());
		console.log('normal Report done')

		// the intended backtest
		const backtest = new Backtesting(this.exchange, this.resultChecking);
		const classicReport: PerformanceReport = (await backtest.start(config))[0];
		console.log('classic done done')

		// check the entry isolated
		const entryTest = new Backtesting(this.exchange, new EntryCheck(FIXED_BAR_EXIT));
		const entryReport = (await entryTest.start(config))[0];
		console.log('entry done done')

		// check the exit condition isolated
		const exitReport = (await this.exitTest(config, this.resultChecking));
		console.log('exit done done')

		return [individualReport, normalTestReport, classicReport, entryReport, exitReport];
	}
}