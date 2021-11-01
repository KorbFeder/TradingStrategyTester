import { OHLCV } from "ccxt";
import { copyFile } from "fs";
import { EMA } from "technicalindicators";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { Candlestick } from "../Consts/Candlestick";
import { ChoppinessIndex } from "./ChoppinessIndex";
import { PivotExtremes } from "./PivotExtremes";

export interface Range {
	startIndex: number;
	endIndex: number;
}

export class FindLiqMoves {
	private static lookbackCandles = 20;
	private static minChopVal = 20;
	private static trendVal = 38;


	static find(data: OHLCV[]): Range[] {
		const liqMoves: Range[] = [];
		const chop: number[] = ChoppinessIndex.calculate(data);
		const offset = data.length - chop.length;
		for(let i = chop.length-1; i > this.lookbackCandles; i--) {
			if(chop[i] <= this.minChopVal) {
				const lookback = i - this.lookbackCandles;
				for(let u = i; u >= lookback; u--) {
					if(chop[u] >= this.trendVal) {
						const {index} = PivotExtremes.leftHigh(chop.map(val => [val, val, val, val, val, val]), u);
						i = index;
						liqMoves.push({startIndex: index + offset, endIndex: i + offset});
						break;
					}
				}
			}
		}
		return liqMoves;
	}
}