import { Exchange, OHLCV, Trade } from "ccxt";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";

const MAX_LOOKBACK = 5000;

export interface FootprintLevel {
	price: number;
	sell: number;
	buy: number;
}

export interface Footprint {
	volume: number;
	delta: number;
	date: Date;
	levels: FootprintLevel[]	
}

export class Delta {
	public async getFootprint(exchange: Exchange, symbol: string, timeframe: Timeframe, tick: number, candleCount?: number): Promise<Footprint[]> {
		const footprint: Footprint[] = []
		let trades: Trade[];
		if(candleCount) {
			// @todo -> candle count calculation
			trades = await exchange.fetchTrades(symbol, new Date(2020, 1, 1).getTime(), MAX_LOOKBACK);
			//trades = await exchange.fetchTrades(symbol, undefined, undefined, {'start_time': start / 1000, 'end_time': end / 1000});
			//while(new Date(trades[0].datetime).getTime() >= start) {
			//	trades = (await exchange.fetchTrades(symbol, undefined, undefined, {'start_time': start / 1000, 'end_time': new Date(trades[0].datetime).getTime() / 1000})).concat(trades);	
			//}
		} else {
			trades = await exchange.fetchTrades(symbol, new Date(2020, 1, 1).getTime(), MAX_LOOKBACK);
		}


		for(let trade of trades) {
			this.createNewFootprint(footprint, timeframe, new Date(trade.datetime));
			let nextPrice;
			if(trade.price % tick > (tick / 2)) {
				nextPrice = trade.price - trade.price % tick + tick;
			} else {
				nextPrice = trade.price - trade.price % tick;
			}
			if(trade.side == 'sell') {
				const index = footprint[footprint.length-1].levels.map((level) => level.price).indexOf(nextPrice);
				if(index != -1) {
					footprint[footprint.length-1].levels[index].sell += trade.amount;
				} else {
					footprint[footprint.length-1].levels.push({price: nextPrice, sell: trade.amount, buy: 0});
					footprint[footprint.length-1].levels.sort((a, b) => b.price - a.price);
				}
			} else if(trade.side == 'buy') {
				const index = footprint[footprint.length-1].levels.map((level) => level.price).indexOf(nextPrice);
				if(index != -1) {
					footprint[footprint.length-1].levels[index].buy += trade.amount;
				} else {
					footprint[footprint.length-1].levels.push({price: nextPrice, sell: 0, buy: trade.amount});
					footprint[footprint.length-1].levels.sort((a, b) => b.price - a.price);
				}
			}
		}
		this.calculateCandleDeltaVolume(footprint);
		return footprint;
	}

	private calculateCandleDeltaVolume(footprints: Footprint[]) {
		for(let footprint of footprints) {
			for(let level of footprint.levels) {
				footprint.delta += level.buy;
				footprint.delta -= level.sell;
				footprint.volume += level.buy;
				footprint.volume += level.sell;
			}
		}
	}

	private createNewFootprint(footprint: Footprint[], timeframe: Timeframe, date: Date) {
		// initialize first footprint
		if(footprint.length == 0) {
			let firstDate: Date;
			switch(timeframe) {
				case Timeframe.m1:
					firstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
					break;
				case Timeframe.m5: 
					firstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes() - (date.getMinutes() % 5));
					break;
				case Timeframe.m15:
					firstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes() - (date.getMinutes() % 15));
					break;
				case Timeframe.m30:
					firstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes() - (date.getMinutes() % 30));
					break;
				case Timeframe.h1:
					firstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
					break;
				case Timeframe.h4:
					firstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() - date.getHours() % 5);
					break;
				case Timeframe.d1:
					firstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
					break;
				case Timeframe.w1:
					firstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() % 7);
					break;
				case Timeframe.Mo1:
					firstDate = new Date(date.getFullYear(), date.getMonth());
					break;
			}
			footprint.push({volume: 0, delta: 0, date: firstDate, levels: []});
			return;
		}

		const timeDiff = timeToNumber(timeframe);
		if(date.getTime() - footprint[footprint.length-1].date.getTime() >= timeDiff) {
			// if there was a big gap push empty footprints
			while(footprint[footprint.length-1].date.getTime() + timeDiff <= date.getTime()) {
				footprint.push({volume: 0, delta: 0, date: new Date(footprint[footprint.length-1].date.getTime() + timeDiff), levels: []})
			}
			return;
		}
	}
}