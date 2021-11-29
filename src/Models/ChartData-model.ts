import { OHLCV, Trade } from "ccxt";

export interface ChartData {
    ohlcv: OHLCV[];
    trades?: Trade[];
}
