import { Exchange, OHLCV } from "ccxt";
import { cloneDeep, mean } from "lodash";
import { std } from "mathjs";
import { Candlestick } from "../Consts/Candlestick";
import { calcStartingTimestamp, Timeframe, timeToNumber } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { fetchWithDate } from "../helpers/fetchWithDate";
import { PerfReportHelper } from "../helpers/PerfReportHelper";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { ManagePosition } from "../Models/ManagePosition-interface";
import { PerformanceReport, SinglePerformanceReport } from "../Models/PerformanceReport-model";
import { IStrategy } from "../Models/Strategy-interface";
import { ITrade } from "../Models/TestAccount-model";
import { TestAccount } from "./TestAccount";

const MIN_BARS = 256;
const TEST_DATA = 256;
const STARTING_BALANCE = 10000;
const DATA_LIMIT = 500;

export interface BacktestConfig {
	startDate: Date;
	endDate: Date;
	symbol: string;
	timeframe: Timeframe;
	strategy: IStrategy;
	includeComissions?: boolean;
	// minium bars to trade, for indicator to calculate the value
	minBarsForIndicator?: number;
	// if closePosOnEntry true, positions are looked at with relation to open positions, 
	// if false each trade will be independent of trades that follow afterwards
	closePositionOnEntryOtherSide?: boolean;
}

export class Backtesting {
    private account: TestAccount | undefined = undefined;

	constructor(
		private exchange: Exchange, 
        private managePosition: ManagePosition
	) {
	}

	async start(config: BacktestConfig): Promise<PerformanceReport> {
		const closePosOnEntry: boolean = config.closePositionOnEntryOtherSide ? config.closePositionOnEntryOtherSide : false;
		const minBarsForIndicator: number = config.minBarsForIndicator ? config.minBarsForIndicator : MIN_BARS;

		const startDateWithIndicatReq: Date = new Date(config.startDate.getTime() - timeToNumber(config.timeframe) * minBarsForIndicator);
		const data: OHLCV[] = await fetchWithDate(this.exchange, config.symbol, config.timeframe, startDateWithIndicatReq, config.endDate);
		const trades: ITrade[] = [];
		

		for(let i = minBarsForIndicator - 1; i < data.length; i++) {
			const subsample = data.slice(0, i);
			const direction: TradeDirection = await config.strategy.calculate(subsample, this.exchange, config.symbol, config.timeframe, calcStartingTimestamp(config.timeframe, Candlestick.timestamp(subsample), DATA_LIMIT), DATA_LIMIT);
			if(!closePosOnEntry) {
				const result: ITrade | undefined = await this.checkResult(data.slice(i-1, data.length-1), subsample, direction, config);
				if(result) {
					trades.push(result);
				}
			} else {

			}
		}

		const perfReportHelper = new PerfReportHelper(this.exchange, config);
		return perfReportHelper.addToPerfRep(trades);
	}

	private async checkResult(confirmationData: OHLCV[], testData: OHLCV[], tradeDirection: TradeDirection, config: BacktestConfig): Promise<ITrade | undefined> {
        const buyPrice: number = confirmationData[confirmationData.length-1][Candlestick.CLOSE];
        if(tradeDirection == TradeDirection.HOLD) {
            return undefined;
        }
        if(config.strategy.usesDynamicExit) {
            const exit = await config.strategy.dynamicExit(this.exchange, config.symbol, config.timeframe, tradeDirection);
            if(exit) {
                const exitPrice = await exit.backTestExit(confirmationData);
                if(tradeDirection == TradeDirection.BUY && exitPrice != -1) {
                    // todo -> dont use close, use wicks for exits
                    if(exitPrice > buyPrice) {
                        return {tradeDirection, win: true, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol: config.symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    } else if(exitPrice < buyPrice) {
                        return {tradeDirection, win: false, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol: config.symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    }
                } else if(tradeDirection == TradeDirection.SELL && exitPrice != -1) {
                    if(exitPrice < buyPrice) {
                        return {tradeDirection, win: true, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol: config.symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    } else if(exitPrice > buyPrice) {
                        return {tradeDirection, win: false, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol: config.symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    }
                }
            } else {
                throw 'no dynamic exit specified';
            }
        } else {
			const {stops, targets} = await config.strategy.getStopLossTarget(testData, Candlestick.open(confirmationData, 1), tradeDirection);
			// calcualte size of the position
			const size = 1;
			//const size = await this.account.calculatePositionSize(stops, Candlestick.close(testData));
			stops.forEach(stop => stop.amount = stop.amount * size);
			targets.forEach(target => target.amount = target.amount * size);

			const position: FuturePosition = {
				symbol: config.symbol, 
				price: Candlestick.open(confirmationData, 1),
				buyOrderType: 'market',
				amount: stops.map(stop => stop.amount).reduce((prev, curr) => prev + curr),
				tradeDirection,
				breakEvenPrice: Candlestick.open(confirmationData, 1),
				stopLosses: stops,
				profitTargets: targets,
			};
			return await this.managePosition.manage(confirmationData, position);
        }
    }

	private exitPosition(dataPoint: OHLCV) {

	}
};