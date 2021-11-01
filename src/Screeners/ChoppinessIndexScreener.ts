import { OHLCV } from "ccxt";
import { IScreener } from "../Models/Screener-interface";
import { ChoppinessIndex } from "../Technicals/ChoppinessIndex";

export class ChoppinessIndexScreener implements IScreener {
	async find(data: OHLCV[]): Promise<boolean> {
		const liqudationMoveCiValue = 20;
		const ci: number[] = ChoppinessIndex.calculate(data);
		let liqIndex: number = ci.length;
		let consolidationIndex: number = ci.length;
		let foundRange: boolean = false;

		// find last liquidation move
		for(let i = ci.length-1; i >= 0; i--) {
			if(ci[i] <= liqudationMoveCiValue) {
				liqIndex = i;
				break;
			}
		}

		// find the consolidation that came after the liquidation move
		for(let i = liqIndex; i < ci.length; i++) {
			if(ci[i] > 61.8) {
				consolidationIndex = i;
				foundRange = true;
				break;
			}
		}
	
		return foundRange;
	}
}