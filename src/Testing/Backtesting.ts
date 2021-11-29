import { Exchange, OHLCV } from "ccxt";
import { time } from "console";
import { cloneDeep } from "lodash";
import { Candlestick } from "../Consts/Candlestick";
import { calcStartingTimestamp, Timeframe, timeToNumber } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { DataCache } from "../Database/DataCache";
import { closePositionBacktesting } from "../helpers/closePositionBacktesting";
import { PerfReportHelper } from "../helpers/PerfReportHelper";
import { ChartData } from "../Models/ChartData-model";
import { PerformanceReport } from "../Models/PerformanceReport-model";
import { IResultChecking } from "../Models/ResultChecking-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { ITrade } from "../Models/TestAccount-model";
import { BacktestConfig } from "../Models/TestingConfigs";
import { HistoricDataProvider } from "./HistoricDataProvider";


const MIN_BARS = 256;
const DATA_LIMIT = 500;
const BARS_REQ = 20;



export class Backtesting {
	private trades: ITrade[][] = [];
	private dataProvider: HistoricDataProvider = new HistoricDataProvider(this.exchange)

	constructor(
		private exchange: Exchange, 
		private resultCheck: IResultChecking,
	) {
	}

	async start(config: BacktestConfig): Promise<PerformanceReport[]> {
		this.trades = [];

		const minBarsForIndicator: number = config.minBarsForIndicator ? config.minBarsForIndicator : MIN_BARS;
		const barsRequiredToTrade: number = config.barsRequiredToTrade ? config.barsRequiredToTrade : BARS_REQ;

		const startDateWithIndicatReq: Date = new Date(config.startDate.getTime() - timeToNumber(config.timeframe) * minBarsForIndicator);
		const currStartDate = config.startDate.getTime() + barsRequiredToTrade * timeToNumber(config.timeframe);
		this.dataProvider.setStartEndDate(startDateWithIndicatReq, config.endDate);

		this.trades = new Array(config.strategies.length).fill([]);
		let resultChecks: IResultChecking[] = [];
		config.strategies.forEach(_ => resultChecks.push(cloneDeep(this.resultCheck)));

		for(let currDate = currStartDate; currDate < config.endDate.getTime();currDate += timeToNumber(config.timeframe)) {

			this.dataProvider.setCurrDate(new Date(currDate));
			for(let i = 0; i < config.strategies.length; i++) {
				const direction: TradeDirection = await config.strategies[i].calculate(this.dataProvider);
				
				const result: ITrade[] | undefined = await resultChecks[i].check(this.dataProvider, direction, config.symbol, config.timeframe, config.strategies[i]);
				if(result) {
					this.trades[i] = this.trades[i].concat(result);
				}
			}
		}

		//if the simulation is over and a position would still be up close it at the last close price
		for(let i = 0; i < config.strategies.length; i++) {
			const trade = closePositionBacktesting(await this.dataProvider.getOhlcv(config.symbol, config.timeframe), resultChecks[i].currPosition);
			resultChecks[i].currPosition = undefined;
			if(trade) {
				this.trades[i].push(trade);
			}
		}
		

		const perfReports: PerformanceReport[] = [];
		for(let strategy_trades of this.trades) {
			const perfReportHelper = new PerfReportHelper(this.exchange, config);
			perfReports.push(await perfReportHelper.addToPerfRep(strategy_trades));
		}
		return perfReports;
	}
};