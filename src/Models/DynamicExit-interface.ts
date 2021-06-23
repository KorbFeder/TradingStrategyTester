import { Exchange, OHLCV } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";

export interface IDynamicExit {
	tradeDirection: TradeDirection;
	exchange: Exchange;
	symbol: string;
	timeframe: Timeframe;

	exitTrade(): Promise<boolean>;
}