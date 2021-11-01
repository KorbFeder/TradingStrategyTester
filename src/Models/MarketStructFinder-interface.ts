import { OHLCV } from "ccxt";
import { MarketStructure } from "../Consts/MarketStructure";

export interface MarketStructFinder {
	calculate(data: OHLCV[]): MarketStructure;
}