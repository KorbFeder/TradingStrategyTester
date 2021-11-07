import { expect } from 'chai';
import 'mocha';
import * as ccxt from "ccxt";
import { calcStartingTimestamp, Timeframe } from '../Consts/Timeframe';
import { TradeDirection } from '../Consts/TradeDirection';
import { Divergence } from '../Technicals/Divergence';
import { PerformanceReport } from '../Models/PerformanceReport-model';

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

/**
 * All Backtests are compared to the same outputs, which NinjaTrader would show
 */
describe('Backtesting-test', () => { 
	it('MA Crossover 10/25 on 1m Timeframe 01.01.21 - 04.11.21', async () => { 
		
	}); 
});