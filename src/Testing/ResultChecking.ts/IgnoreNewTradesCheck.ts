import { OHLCV } from "ccxt";
import { Candlestick } from "../../Consts/Candlestick";
import { TradeDirection } from "../../Consts/TradeDirection";
import { FuturePosition } from "../../Models/FuturePosition-interface";
import { ManagePosition } from "../../Models/ManagePosition-interface";
import { IResultChecking } from "../../Models/ResultChecking-interface";
import { ITrade } from "../../Models/TestAccount-model";
import { ManageDefaultPosition } from "../../Orders/ManageDefaultPosition";
import { BacktestConfig } from "../Backtesting";

export class IgnoreNewTradesCheck implements IResultChecking {
	currPosition: FuturePosition | undefined;

	constructor(public managePosition: ManagePosition = new ManageDefaultPosition){}

	async check(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig): Promise<ITrade[] | undefined> {
		if(direction != TradeDirection.HOLD) {
			// dont open a new position if there is still one active
			if(!this.currPosition) {
				this.managePosition.reset();
				const entry = Candlestick.open(data, i);
				this.managePosition.reset();
				const {stops, targets} = await config.strategy.getStopLossTarget(data.slice(0, i), entry, direction);
				this.currPosition = {
					symbol: config.symbol, 
					price: entry,
					buyOrderType: 'market',
					amount: stops.map(stop => stop.amount).reduce((prev, curr) => prev + curr),
					tradeDirection: direction,
					breakEvenPrice: entry,
					stopLosses: stops,
					profitTargets: targets,
				};
			}
		}
		const trades: ITrade[] = []
		if(this.currPosition) {
			const result: ITrade | undefined = await this.managePosition.manage(data[i], this.currPosition);
			if(result) {
				trades.push(result);
				this.currPosition = undefined;
			}
		}
		return trades;
	}
}