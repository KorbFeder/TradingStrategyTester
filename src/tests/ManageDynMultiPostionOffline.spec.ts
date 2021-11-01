import { expect } from 'chai';
import 'mocha';
import * as ccxt from "ccxt";
import { calcStartingTimestamp, Timeframe } from '../Consts/Timeframe';
import { TradeDirection } from '../Consts/TradeDirection';
import { Divergence } from '../Technicals/Divergence';
import { ManageMultipartPostionOffline } from '../Orders/ManageMultipartPositionOffline';
import { FuturePosition } from '../Models/FuturePosition-interface';
import { Candlestick } from '../Consts/Candlestick';
import { isEqual } from 'lodash';
import { ITrade } from '../Models/TestAccount-model';
import { ManageDynMultiPostionOffline } from '../Orders/ManageDynMultiPositionOffline';

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

describe('ManagePositionDynMultiPosition', () => { 

	it('hit first target and get stopped out in profit', async () => { 
		const symbol = 'BTC-PERP'
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 6, 27).getTime(), 500);
		const managePos = new ManageDynMultiPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 10,
			tradeDirection: TradeDirection.BUY,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 35619, amount: 5}, {price: 34801, amount: 5}],
			profitTargets:[{price: 40880, amount: 5}, {price: 43000 ,amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			firstEntry: 39491,
			lastSize: 5,
			initialSize: 10,
			tradeDirection: TradeDirection.BUY, 
			win: true, 
			date: new Date(Candlestick.timestamp(data, 2)), 
			breakEvenPrice: 38102, 
			exitPrice: 39491, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	}); 

	it('hit first target and get stopped out in profit', async () => { 
		const symbol = 'BTC-PERP'
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 6, 27).getTime(), 500);
		const managePos = new ManageDynMultiPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 10,
			tradeDirection: TradeDirection.BUY,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 34801, amount: 10}],
			profitTargets:[{price: 40880, amount: 5}, {price: 43000 ,amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			firstEntry: 39491,
			initialSize: 10,
			lastSize: 5,
			tradeDirection: TradeDirection.BUY, 
			win: true, 
			date: new Date(Candlestick.timestamp(data, 2)), 
			breakEvenPrice: 38102, 
			exitPrice: 39491, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	}); 

	// same as with none dynamic
	it('should return throw an error', async () => { 
		let isError = false;
		const symbol = 'BTC-PERP'
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 7, 19).getTime(), 500);
		const managePos = new ManageMultipartPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 10,
			tradeDirection: TradeDirection.BUY,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 43828, amount: 5}],
			profitTargets:[{price: 45000, amount: 5}],
		}
		try{
			await managePos.manage(data, position);
		} catch(err) {
			isError = true;
		}

		expect(isError).to.equal(true);
	}); 

	it('normal buy order gets stopped out', async () => { 
		const symbol = 'BTC-PERP'
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 7, 19).getTime(), 500);
		const managePos = new ManageMultipartPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 5,
			tradeDirection: TradeDirection.BUY,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 43828, amount: 5}],
			profitTargets:[{price: 45000, amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			firstEntry: Candlestick.close(data, 0),
			lastSize: 5,
			initialSize: 5,
			tradeDirection: TradeDirection.BUY, 
			win: false, 
			date: new Date(Candlestick.timestamp(data, 0)), 
			breakEvenPrice: Candlestick.close(data, 0), 
			exitPrice: 43828, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	}); 

	it('normal buy order hits target', async () => { 
		const symbol = 'BTC-PERP'
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 7, 19).getTime(), 500);
		const managePos = new ManageMultipartPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 5,
			tradeDirection: TradeDirection.BUY,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 43700, amount: 5}],
			profitTargets:[{price: 48000, amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			firstEntry: Candlestick.close(data, 0),
			lastSize: 5,
			initialSize: 5,
			tradeDirection: TradeDirection.BUY, 
			win: true, 
			date: new Date(Candlestick.timestamp(data, 1)), 
			breakEvenPrice: Candlestick.close(data, 0), 
			exitPrice: 48000, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	});

	it('normal sell order gets stopped out', async () => { 
		const symbol = 'BTC-PERP'
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 7, 19).getTime(), 500);
		const managePos = new ManageMultipartPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 5,
			tradeDirection: TradeDirection.SELL,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 47000, amount: 5}],
			profitTargets:[{price: 43000, amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			firstEntry: Candlestick.close(data, 0),
			lastSize: 5,
			initialSize: 5,
			tradeDirection: TradeDirection.SELL, 
			win: false, 
			date: new Date(Candlestick.timestamp(data, 0)), 
			breakEvenPrice: Candlestick.close(data, 0), 
			exitPrice: 47000, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	});
});