import * as ccxt from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { OptParam } from "../Testing/Optimization";
import { IDynamicExit } from "./DynamicExit-interface";
import { LimitOrder } from "./FuturePosition-interface";

export interface IStrategy {
	usesDynamicExit: boolean;
    // calculate strategy. Data is array of ohlcv datas, should be ordered by timeframe
    calculate(data: ccxt.OHLCV[], exchange?: ccxt.Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection>;
    getStopLossTarget(data: ccxt.OHLCV[], direction: TradeDirection): Promise<{stops: LimitOrder[], targets: LimitOrder[]}>;
    dynamicExit(exchange: ccxt.Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined>;
    //getParams(): OptParam[];
    //setParams(params: OptParam[]): void;
}