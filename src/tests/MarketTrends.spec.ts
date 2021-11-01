import { expect } from 'chai';
import 'mocha';
import * as ccxt from "ccxt";
import { calcStartingTimestamp, Timeframe } from '../Consts/Timeframe';
import { TradeDirection } from '../Consts/TradeDirection';
import { Divergence } from '../Technicals/Divergence';
import { MarketTrend } from '../Technicals/MarketTrend';
import { Trend } from '../Consts/Trend';

const exchangeId = 'ftx';
const exchangeClass = ccxt[exchangeId];
const exchange = new exchangeClass ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.SECRET,
    'timeout': 30000,
    'enableRateLimit': true,
});
exchange.headers = {
    'FTX-SUBACCOUNT': 'Bot',
}
exchange.options = {
    defaultMarket: 'futures'
};

describe('MarketTrends', () => { 
	it('MTF 200 Emas all bulish', async () => { 
		const limit: number = 500;
		const trend = await MarketTrend.mft200Ema('BTC-PERP', exchange, [Timeframe.m1, Timeframe.h1, Timeframe.m15], new Date(2021, 7, 19, 22, 30, 0).getTime(), limit);

		expect(trend).to.equal(Trend.UP);
	}); 

	it('MTF 200 Emas all bearish', async () => { 
		const limit: number = 500;
		const trend = await MarketTrend.mft200Ema('BTC-PERP', exchange, [Timeframe.m1, Timeframe.h1, Timeframe.m15], new Date(2021, 4, 23, 10, 0, 0).getTime(), limit);

		expect(trend).to.equal(Trend.DOWN);
	}); 

	it('MTF 200 Emas all consolidation', async () => { 
		const limit: number = 500;
		const trend = await MarketTrend.mft200Ema('BTC-PERP', exchange, [Timeframe.m1, Timeframe.h1, Timeframe.m15], new Date(2021, 6, 17, 18, 0, 0).getTime(), limit);

		expect(trend).to.equal(Trend.SIDE);
	}); 

});