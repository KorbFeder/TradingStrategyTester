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

describe('ManagePositionMultiPart', () => { 
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

	it('normal sell order hits target', async () => { 
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
			stopLosses: [{price: 49000, amount: 5}],
			profitTargets:[{price: 44000, amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			firstEntry: Candlestick.close(data, 0),
			lastSize: 5,
			initialSize: 5,
			tradeDirection: TradeDirection.SELL, 
			win: true, 
			date: new Date(Candlestick.timestamp(data, 0)), 
			breakEvenPrice: Candlestick.close(data, 0), 
			exitPrice: 44000, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	});

	it('take profit 2 times, buy side', async () => { 
		const symbol = 'BTC-PERP'
		const tradeDirection = TradeDirection.BUY;
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 7, 19).getTime(), 500);
		const managePos = new ManageMultipartPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 10,
			tradeDirection,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 43362, amount: 10}],
			profitTargets:[{price: 49676, amount: 5}, {price: 52209, amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			firstEntry: Candlestick.close(data, 0),
			lastSize: 5,
			initialSize: 10,
			tradeDirection, 
			win: true, 
			date: new Date(Candlestick.timestamp(data, 18)), 
			breakEvenPrice: 43910, 
			exitPrice: 52209, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	});

	it('take profit 2 times, sell side', async () => { 
		const symbol = 'BTC-PERP'
		const tradeDirection = TradeDirection.SELL;
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 8, 6).getTime(), 500);
		const managePos = new ManageMultipartPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 10,
			tradeDirection,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 54082, amount: 10}],
			profitTargets:[{price: 50474, amount: 5}, {price: 45895, amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			firstEntry: Candlestick.close(data, 0),
			lastSize: 5,
			initialSize: 10,
			tradeDirection, 
			win: true, 
			date: new Date(Candlestick.timestamp(data, 2)), 
			breakEvenPrice: 55018, 
			exitPrice: 45895, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	});

	it('take profit onece and than get stopped out, buy side', async () => { 
		const symbol = 'BTC-PERP'
		const tradeDirection = TradeDirection.BUY;
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 7, 19).getTime(), 500);
		const managePos = new ManageMultipartPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 10,
			tradeDirection,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 43362, amount: 10}],
			profitTargets:[{price: 49676, amount: 5}, {price: 70209, amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			initialSize: 10,
			firstEntry: Candlestick.close(data, 0),
			lastSize: 5,
			tradeDirection, 
			win: false, 
			date: new Date(Candlestick.timestamp(data, 19)), 
			breakEvenPrice: 43910, 
			exitPrice: 43362, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	});

	it('take profit onece and than get stopped out, sell side', async () => { 
		const symbol = 'BTC-PERP'
		const tradeDirection = TradeDirection.SELL;
		const data: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, Timeframe.d1, new Date(2021, 7, 14).getTime(), 500);
		const managePos = new ManageMultipartPostionOffline();

		const position: FuturePosition = {
			symbol,
			price: Candlestick.close(data, 0),
			buyOrderType: 'limit',
			amount: 10,
			tradeDirection,
			breakEvenPrice: Candlestick.close(data, 0),
			stopLosses: [{price: 49000, amount: 10}],
			profitTargets:[{price: 44000, amount: 5}, {price: 20000, amount: 5}],
		}
		const res = await managePos.manage(data, position);
		const dataToCheck: ITrade = {
			initialSize: 10,
			firstEntry: Candlestick.close(data, 0),
			lastSize: 5,
			tradeDirection, 
			win: true, 
			date: new Date(Candlestick.timestamp(data, 6)), 
			breakEvenPrice: 50266, 
			exitPrice: 49000, 
			symbol: symbol
		};

		expect(isEqual(res, dataToCheck)).to.equal(true);
	});

});