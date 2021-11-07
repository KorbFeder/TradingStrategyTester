import { Exchange } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { IStrategy } from "../Models/Strategy-interface";

export interface WalkForwardInput {

}

export class WalkForwardTesting {
	constructor(private exchange: Exchange) {}

	calcualte(symbols: string[], timeframes: Timeframe[], strategy: IStrategy) {
		
	}
}