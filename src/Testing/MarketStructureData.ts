import { MarketStructure } from "../Consts/MarketStructure";
import { Timeframe } from "../Consts/Timeframe";
import { CryptoTimestamp } from "./BacktestData";

export interface MarketStructureTimestamp {
	symbol: string;
	startTimestamp: Date;
	endTimestamp: Date;
	marketStructure: MarketStructure;
	timeframe: Timeframe
}

export const marketStructureData: MarketStructureTimestamp[] = [
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 8, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 9, 8, 1)),
		marketStructure: MarketStructure.RANGING,
		timeframe: Timeframe.m15
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 8, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 9, 9, 6)),
		marketStructure: MarketStructure.RANGING,
		timeframe: Timeframe.m15
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 5, 7, 2)),
		marketStructure: MarketStructure.RANGING,
		timeframe: Timeframe.h4
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 9, 22, 23, 10)),
		marketStructure: MarketStructure.RANGING,
		timeframe: Timeframe.m5
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 9, 22, 1, 20)),
		marketStructure: MarketStructure.RANGING,
		timeframe: Timeframe.m5
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 9, 5, 13)),
		marketStructure: MarketStructure.UPTREND,
		timeframe: Timeframe.h1
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 8, 28, 4, 30)),
		marketStructure: MarketStructure.DOWNTREND,
		timeframe: Timeframe.h1
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 8, 22, 19)),
		marketStructure: MarketStructure.DOWNTREND,
		timeframe: Timeframe.h1
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 9, 5, 13)),
		marketStructure: MarketStructure.UPTREND,
		timeframe: Timeframe.m15
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 8, 28, 4, 30)),
		marketStructure: MarketStructure.DOWNTREND,
		timeframe: Timeframe.m15
	},
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 3, 18, 0, 0, 0, 0), 
		endTimestamp: new Date(Date.UTC(2021, 8, 22, 19)),
		marketStructure: MarketStructure.DOWNTREND,
		timeframe: Timeframe.m15
	},
];

