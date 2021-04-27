import * as ccxt from "ccxt";
import { TradePressure } from "./TradePressure";

export interface Strategy {
    exchange: ccxt.binance;
    symbol: string;
    tradeIndicator(): Promise<TradePressure>;
}