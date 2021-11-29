import { OHLCV } from "ccxt";
import { Candlestick } from "../../Consts/Candlestick";
import { Timeframe } from "../../Consts/Timeframe";
import { TradeDirection } from "../../Consts/TradeDirection";
import { ChartData } from "../../Models/ChartData-model";
import { IDataProvider } from "../../Models/DataProvider-interface";
import { FuturePosition } from "../../Models/FuturePosition-interface";
import { ManagePosition } from "../../Models/ManagePosition-interface";
import { IResultChecking } from "../../Models/ResultChecking-interface";
import { IStrategy } from "../../Models/Strategy-interface";
import { ITrade } from "../../Models/TestAccount-model";
import { ManageDefaultPosition } from "../../Orders/ManageDefaultPosition";
import { HistoricDataProvider } from "../HistoricDataProvider";

export class NormalCheck implements IResultChecking {
	currPosition: FuturePosition | undefined;

	constructor(public managePosition: ManagePosition = new ManageDefaultPosition()) {}

	async check(dataProvider: HistoricDataProvider, direction: TradeDirection, symbol: string, timeframe: Timeframe, strategy: IStrategy): Promise<ITrade[] | undefined> {
		const data: OHLCV[] = await dataProvider.getOhlcv(symbol, timeframe);
		const confirmation = dataProvider.getConfimationData(timeframe);
		const entry = Candlestick.open(confirmation, 1);
		if(direction != TradeDirection.HOLD) {
			const trades: ITrade[] = [];
			// if there is still an position open close it at the price the new position opens
			if(this.currPosition) {
				trades.push({
					initialSize: this.currPosition.amount,
					tradeDirection: this.currPosition.tradeDirection, 
					win: this.currPosition.tradeDirection == TradeDirection.BUY ? this.currPosition.price < entry : this.currPosition.price > entry, 
					date: new Date(Candlestick.timestamp(data)), 
					breakEvenPrice: this.currPosition.breakEvenPrice, 
					exitPrice: entry, 
					lastSize: this.currPosition.amount,
					symbol: this.currPosition.symbol, 
					firstEntry: this.currPosition.price,
				});
			}
			this.managePosition.reset();
			const stops = await strategy.getStopLoss(dataProvider, entry, direction);
			const targets = await strategy.getTarget(dataProvider, entry, direction);
			this.currPosition = {
				symbol: symbol, 
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
			const result: ITrade | undefined = await this.managePosition.manage(data[data.length-1], this.currPosition);
			if(result) {
				this.currPosition = undefined;
				return [result];
			}
		}
	}
}