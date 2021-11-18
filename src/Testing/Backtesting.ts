import { Exchange, OHLCV } from "ccxt";
import { cloneDeep, initial, mean } from "lodash";
import { std } from "mathjs";
import { positional } from "yargs";
import { Candlestick } from "../Consts/Candlestick";
import { calcStartingTimestamp, Timeframe, timeToNumber } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { closePositionBacktesting } from "../helpers/closePositionBacktesting";
import { fetchWithDate } from "../helpers/fetchWithDate";
import { PerfReportHelper } from "../helpers/PerfReportHelper";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { ManagementType, ManagePosition } from "../Models/ManagePosition-interface";
import { PerformanceReport, SinglePerformanceReport } from "../Models/PerformanceReport-model";
import { IResultChecking } from "../Models/ResultChecking-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { ITrade } from "../Models/TestAccount-model";
import { TestAccount } from "./TestAccount";

const MIN_BARS = 256;
const DATA_LIMIT = 500;
const BARS_REQ = 20;

export interface BacktestConfig {
	startDate: Date;
	endDate: Date;
	symbol: string;
	timeframe: Timeframe;
	strategy: IStrategy;
	slippage?: number;
	includeComissions?: boolean;
	// minium bars to trade, for indicator to calculate the value
	minBarsForIndicator?: number;
	barsRequiredToTrade?: number;
}

export class Backtesting {
	private trades: ITrade[] = [];

	constructor(
		private exchange: Exchange, 
		private resultCheck: IResultChecking,
	) {
	}

	async start(config: BacktestConfig): Promise<PerformanceReport> {
		const minBarsForIndicator: number = config.minBarsForIndicator ? config.minBarsForIndicator : MIN_BARS;
		const barsRequiredToTrade: number = config.barsRequiredToTrade ? config.barsRequiredToTrade : BARS_REQ;

		const startDateWithIndicatReq: Date = new Date(config.startDate.getTime() - timeToNumber(config.timeframe) * minBarsForIndicator);
		// @todo -> save historic data in database, so it doenst need to be fetched over and over again (rate limit makes this very slow)
		const data: OHLCV[] = await fetchWithDate(this.exchange, config.symbol, config.timeframe, startDateWithIndicatReq, config.endDate);
		this.trades = [];
		
		for(let i = minBarsForIndicator + barsRequiredToTrade + 1; i < data.length; i++) {
			const subsample = data.slice(0, i);
			const direction: TradeDirection = await config.strategy.calculate(subsample, this.exchange, config.symbol, config.timeframe, calcStartingTimestamp(config.timeframe, Candlestick.timestamp(subsample), DATA_LIMIT), DATA_LIMIT);
			const result = await this.resultCheck.check(data, i, direction, config); 
			if(result) {
				this.trades.concat(result);
			}
		}

		// if the simulation is over and a position would still be up close it at the last close price
		const trade = this.closeLastPosition(data);
		if(trade) {
			this.trades.push(trade);
		}

		const perfReportHelper = new PerfReportHelper(this.exchange, config);
		const report = await perfReportHelper.addToPerfRep(this.trades);
		this.trades = [];
		return report;
	}

	private closeLastPosition(data: OHLCV[]): ITrade | undefined {
		const trade = closePositionBacktesting(data, this.resultCheck.currPosition);
		this.resultCheck.currPosition = undefined;
		return trade;
	}
};