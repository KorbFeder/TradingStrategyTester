import * as ccxt from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "./DynamicExit-interface";

export interface IStrategy {
	usesDynamicExit: boolean;
    // calculate strategy. Data is array of ohlcv datas, should be ordered by timeframe
    calculate(data: ccxt.OHLCV[], optional?: any): Promise<TradeDirection>;
    getStopLossTarget(data: ccxt.OHLCV[], direction: TradeDirection): Promise<{stop: number, target: number}>;
    dynamicExit(exchange: ccxt.Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined>;
}