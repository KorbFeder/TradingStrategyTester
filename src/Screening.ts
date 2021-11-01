import { Exchange, OHLCV } from "ccxt";
import { Timeframe } from "./Consts/Timeframe";
import { getMarketSymbols } from "./helper";
import { IBot } from "./Models/Bot-interface";
import { IScreener } from "./Models/Screener-interface";

interface Candidate {
	symbol: string,
	timeframe: string
}

export class Screening implements IBot {
	private lookBack = 300;

	constructor(public exchange: Exchange, private screener: IScreener, private timeframes?: Timeframe[]) {}

	async start(): Promise<void> {
		const symbols: string[] = await getMarketSymbols(this.exchange);
		const candidates: Candidate[] = [];
		
		// Timeframes from the exchnage, but remove timeframes that are some seconds
		let timeframes: string[] = Object.keys(this.exchange.timeframes).map(timeframe => timeframe.toString()).filter(timeframe => !timeframe.includes('s'));
		if(this.timeframes && this.timeframes.length > 0) {
			timeframes = this.timeframes;
		}

		for(let symbol of symbols) {
			for(let timeframe of timeframes) {
				const data: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, this.lookBack);
				if(await this.screener.find(data)) {
					candidates.push({symbol, timeframe});
				}
			}
		}

		this.printResults(candidates);
	}
	
	private printResults(candidates: Candidate[]) {
		console.log('Results:');
		console.log('----------------------------------');
		for(let candidate of candidates) {
			console.log('Symbol:', candidate.symbol);
			console.log('Timeframe:', candidate.timeframe);
			console.log('----------------------------------');
		}
	}
}