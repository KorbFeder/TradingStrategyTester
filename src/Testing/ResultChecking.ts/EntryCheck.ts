import { OHLCV } from "ccxt";
import { Candlestick } from "../../Consts/Candlestick";
import { TradeDirection } from "../../Consts/TradeDirection";
import { closePositionBacktesting } from "../../helpers/closePositionBacktesting";
import { FuturePosition } from "../../Models/FuturePosition-interface";
import { ManagePosition } from "../../Models/ManagePosition-interface";
import { IResultChecking } from "../../Models/ResultChecking-interface";
import { ITrade } from "../../Models/TestAccount-model";
import { ManageDefaultPosition } from "../../Orders/ManageDefaultPosition";
import { ManageFixedBarExit } from "../../Orders/ManageFixedBarExit";
import { BacktestConfig } from "../Backtesting";

export class EntryCheck implements IResultChecking {
	currPosition: FuturePosition | undefined;

	constructor(private fixedBars: number, public managePosition: ManagePosition = new ManageFixedBarExit(fixedBars)) {}

	async check(data: OHLCV[], i: number, direction: TradeDirection, config: BacktestConfig): Promise<ITrade[] | undefined> {
		if(direction != TradeDirection.HOLD) {
			this.managePosition.reset();
			const confirmationData = data.slice(i-1, data.length-1);
			const position: FuturePosition = {
				symbol: config.symbol, 
				price: Candlestick.open(confirmationData, 1),
				buyOrderType: 'market',
				amount: 1,
				tradeDirection: direction,
				breakEvenPrice: Candlestick.open(confirmationData, 1),
				stopLosses: [],
				profitTargets: [],
			};
			this.currPosition = position;
		
			const trades: ITrade[] = [];
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