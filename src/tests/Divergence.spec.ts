import { expect } from 'chai';
import 'mocha';
import * as ccxt from "ccxt";
import { calcStartingTimestamp, Timeframe } from '../Consts/Timeframe';
import { TradeDirection } from '../Consts/TradeDirection';
import { Divergence } from '../Technicals/Divergence';

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

describe('Divergence', () => { 
	it('should return Tradedirection.BUY', async () => { 
        const startingTime = calcStartingTimestamp(Timeframe.h4, 1589875200000, 500);
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV('BTC-PERP', Timeframe.h4, startingTime, 500);

		const {tradeDirection} = Divergence.hiddenRsi(data);
		expect(tradeDirection).to.equal(TradeDirection.BUY);
	}); 
});