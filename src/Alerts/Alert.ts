import { Exchange, OHLCV } from "ccxt";
import { CandleList } from "technicalindicators";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { Database } from "../Database";
import { getMarketSymbols } from "../helper";
import { IBot } from "../Models/Bot-interface";
import path from "path";
import { notify } from "node-notifier";

const MIN_DATA = 100

export class Alert implements IBot {
	constructor(public exchange: Exchange, private db: Database) {}

	async start(): Promise<void> {
		const symbols: string[] = await getMarketSymbols(this.exchange);
		
		while(true) {
			const alerts = await this.db.loadAlerts();	
			for(let alert of alerts) {
				try{
					const data: OHLCV[] = await this.exchange.fetchOHLCV(alert.symbol, Timeframe.m1, undefined, MIN_DATA);
					if(Candlestick.high(data) > alert.price && Candlestick.low(data) < alert.price) {
						console.log(alert.symbol + ' reached price of ' + alert.price);
						await this.db.removeAlert(alert._id);

						notify({
							title: alert.symbol + ' Alert!',
							icon: path.join(__dirname, 'alert.png'),
							message: alert.symbol + ' reached price of ' + alert.price,
							id: 0,
							appID: 'Trading Bot',
						});
					}
				}
				catch(err) {
					console.log(err);
				}
			}
		}
	}
}