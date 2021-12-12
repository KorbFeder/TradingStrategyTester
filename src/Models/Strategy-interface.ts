import * as ccxt from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { OptimizationParameters } from "../Testing/Optimizing";
import { IDataProvider } from "./DataProvider-interface";
import { IDynamicExit } from "./DynamicExit-interface";
import { LimitOrder } from "./FuturePosition-interface";

export interface IStrategy {
    barsNeededForIndicator: number;

    calculate(dataProvider: IDataProvider): Promise<TradeDirection>;
    getStopLoss(dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection): Promise<LimitOrder[]>;
    getTarget(dataProvider: IDataProvider, entryPrice: number, tradeDirection: TradeDirection): Promise<LimitOrder[]>
    checkExit(dataProvider: IDataProvider, tradeDirection: TradeDirection): Promise<boolean>;

    getParams(): OptimizationParameters[];
    setParams(value: number[]): void;
    getDefaultParams(): number[];
}