import { OHLCV } from "ccxt";
import { range } from "lodash";
import { IScreener } from "../Models/Screener-interface";
import { FindLiqMoves } from "../Technicals/FindLiqMoves";

export class LiqMoveScreener implements IScreener {
	constructor(private lookBackRange: number = 10) {}

	async find(data: OHLCV[]): Promise<boolean> {
		const ranges = FindLiqMoves.find(data);
		// check if one of the last 2 is a liq move
		if(ranges.length != 0) {
			if(data.length - ranges[0].endIndex <= this.lookBackRange) {
				return true;
			}
		}
		return false;
	}
}