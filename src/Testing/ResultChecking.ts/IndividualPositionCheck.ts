import { OHLCV } from "ccxt";
import { Candlestick } from "../../Consts/Candlestick";
import { TradeDirection } from "../../Consts/TradeDirection";
import { closePositionBacktesting } from "../../helpers/closePositionBacktesting";
import { FuturePosition } from "../../Models/FuturePosition-interface";
import { ManagePosition } from "../../Models/ManagePosition-interface";
import { IResultChecking } from "../../Models/ResultChecking-interface";
import { ITrade } from "../../Models/TestAccount-model";
import { ManageDefaultPosition } from "../../Orders/ManageDefaultPosition";
import { BacktestConfig } from "../Backtesting";

export class IndividualPositionCheck implements IResultChecking {
	currPosition: FuturePosition | undefined;

	constructor(public managePosition: ManagePosition = new ManageDefaultPosition()) {}

	async check(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig): Promise<ITrade[] | undefined> {
		if(direction != TradeDirection.HOLD) {
			const testData = data.slice(0, i);
			const confirmationData = data.slice(i-1, data.length-1);
			const {stops, targets} = await config.strategy.getStopLossTarget(testData, Candlestick.open(confirmationData, 1), direction);
			// calcualte size of the position
			const size = 1;
			//const size = await this.account.calculatePositionSize(stops, Candlestick.close(testData));
			stops.forEach(stop => stop.amount = stop.amount * size);
			targets.forEach(target => target.amount = target.amount * size);
			this.managePosition.reset();

			const position: FuturePosition = {
				symbol: config.symbol, 
				price: Candlestick.open(confirmationData, 1),
				buyOrderType: 'market',
				amount: stops.map(stop => stop.amount).reduce((prev, curr) => prev + curr),
				tradeDirection: direction,
				breakEvenPrice: Candlestick.open(confirmationData, 1),
				stopLosses: stops,
				profitTargets: targets,
			};
			this.currPosition = position;
		
			const trades: ITrade[] = []
			for(let data of confirmationData) {
				const result = await this.managePosition.manage(data, position);
				if(result) {
					trades.push(result);
					this.currPosition = undefined;
					break;
				}
			}

			// if possition couldnt be closed in confirmation data close it at the end of the data
			if(this.currPosition) {
				const trade = closePositionBacktesting(data, this.currPosition);
				if(trade) {
					trades.push(trade); 	
				}
				this.currPosition = undefined;
			}
			return trades;
		}
	}
}