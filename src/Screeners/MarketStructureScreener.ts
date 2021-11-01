import { OHLCV } from "ccxt";
import { Trend } from "../Consts/Trend";
import { IScreener } from "../Models/Screener-interface";
import { MarketTrend } from "../Technicals/MarketTrend";

export class MarketStructureScreener implements IScreener {
	async find(data: OHLCV[]): Promise<boolean> {
		const trendDir = Trend.SIDE;
		const percentage = 0.7;

		const trends: Trend[] = [];
		trends.push(MarketTrend.superGuppy(data));
		trends.push(MarketTrend.adx(data));
		trends.push(MarketTrend.ema(data));
		trends.push(MarketTrend.macd(data));
		trends.push(MarketTrend.rsi(data));
		trends.push(MarketTrend.tripleSMA(data));
		trends.push(MarketTrend.renko(data));

		let count = 0;
		for(let trend of trends) {
			if(trendDir == trend) {
				count++;
			}
		}
		const rate = count / trends.length;
		if(rate >= percentage) {
			return true;
		}
		return false;
	}

}