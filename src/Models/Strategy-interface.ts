import * as ccxt from "ccxt";
import { TradeDirection } from "../Consts/TradeDirection";

export interface IStrategy {
    exchange: ccxt.Exchange;
    winrate: number;

    calculate(symbol: string): Promise<TradeDirection> | TradeDirection;
    getConfidenceValue(): number;
    backpropagation(successful: boolean): void;
    getStopLossTarget(symbol: string): Promise<{stop: number, target: number}> | {stop: number, target: number};
}