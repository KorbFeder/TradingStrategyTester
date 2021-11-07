import { OHLCV } from "ccxt";
import { IStrategy } from "../Models/Strategy-interface";

export interface OptParam {
	max: number,
	min: number,
	step: number
};

export class Optimization {
	calculate(data: OHLCV[], strategy: IStrategy) {

	}
}