import { OHLCV } from "ccxt";
import { Candlestick } from "../../Consts/Candlestick";
import { Timeframe } from "../../Consts/Timeframe";
import { TradeDirection } from "../../Consts/TradeDirection";
import { closePositionBacktesting } from "../../helpers/closePositionBacktesting";
import { IDataProvider } from "../../Models/DataProvider-interface";
import { FuturePosition } from "../../Models/FuturePosition-interface";
import { ManagePosition } from "../../Models/ManagePosition-interface";
import { IResultChecking } from "../../Models/ResultChecking-interface";
import { IStrategy } from "../../Models/Strategy-interface";
import { ITrade } from "../../Models/TestAccount-model";
import { ManageDefaultPosition } from "../../Orders/ManageDefaultPosition";
import { ManageFixedBarExit } from "../../Orders/ManageFixedBarExit";
import { HistoricDataProvider } from "../HistoricDataProvider";

export class EntryCheck implements IResultChecking {
	currPosition: FuturePosition | undefined;

	constructor(private fixedBars: number, public managePosition: ManagePosition = new ManageFixedBarExit(fixedBars)) {}

	async check(dataProvider: HistoricDataProvider, direction: TradeDirection, symbol: string, timeframe: Timeframe, strategy: IStrategy): Promise<ITrade[] | undefined> {
		const data = await dataProvider.getOhlcv(symbol, timeframe);
		if(direction != TradeDirection.HOLD) {
			this.managePosition.reset();
			const confirmationData = dataProvider.getConfimationData(timeframe);
			if(confirmationData.length <= 1) {
				return undefined;
			}
			const position: FuturePosition = {
				symbol: symbol, 
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