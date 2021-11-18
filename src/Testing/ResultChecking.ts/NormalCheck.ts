import { OHLCV } from "ccxt";
import { Candlestick } from "../../Consts/Candlestick";
import { TradeDirection } from "../../Consts/TradeDirection";
import { FuturePosition } from "../../Models/FuturePosition-interface";
import { ManagePosition } from "../../Models/ManagePosition-interface";
import { IResultChecking } from "../../Models/ResultChecking-interface";
import { ITrade } from "../../Models/TestAccount-model";
import { ManageDefaultPosition } from "../../Orders/ManageDefaultPosition";
import { BacktestConfig } from "../Backtesting";

export class NormalCheck implements IResultChecking {
	currPosition: FuturePosition | undefined;

	constructor(public managePosition: ManagePosition = new ManageDefaultPosition()) {}

	async check(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig): Promise<ITrade[] | undefined> {
		if(direction != TradeDirection.HOLD) {
			const trades: ITrade[] = [];
			// if there is still an position open close it at the price the new position opens
			if(this.currPosition) {
				const exitPrice = Candlestick.open(data, i);
				trades.push({
					initialSize: this.currPosition.amount,
					tradeDirection: this.currPosition.tradeDirection, 
					win: this.currPosition.tradeDirection == TradeDirection.BUY ? this.currPosition.price < exitPrice : this.currPosition.price > exitPrice, 
					date: new Date(Candlestick.timestamp(data, i)), 
					breakEvenPrice: this.currPosition.breakEvenPrice, 
					exitPrice, 
					lastSize: this.currPosition.amount,
					symbol: this.currPosition.symbol, 
					firstEntry: this.currPosition.price,
				});
			}
			this.managePosition.reset();
			const entry = Candlestick.open(data, i);
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
			return trades;
		}

		// if position 
		if(this.currPosition) {
			const result: ITrade | undefined = await this.managePosition.manage(data[i], this.currPosition);
			if(result) {
				this.currPosition = undefined;
				return [result];
			}
		}
	}
}