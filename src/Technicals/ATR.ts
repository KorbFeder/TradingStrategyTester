import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";
import { RMA } from "./RMA";

export class ATR {
	static calculate(data: OHLCV[], length: number) {
		const trueRange: number[] = data.map(d => d[Candlestick.HIGH] - d[Candlestick.LOW]);
		//true range can be also calculated with tr(true)
		return RMA.calculate(trueRange, length);
	}
}