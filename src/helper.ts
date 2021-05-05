import * as ccxt from "ccxt";
import { strict } from "node:assert";
import { ATR } from "technicalindicators";
import { Timeframe } from "./Consts/Timeframe";
import { IStrategy } from "./Models/Strategy-interface";

export function sleep(ms: number) {
    new Promise(resolve => setTimeout (resolve, ms));
}

// function that returns all market symbols that are traded against usdt
export async function getMarketSymbols(exchange: ccxt.Exchange): Promise<string[]> {
    await exchange.loadMarkets();
    const market = Object.entries(exchange.markets);
    const topCryptos: number = process.env.TOP_CRYPTOS ? parseInt(process.env.TOP_CRYPTOS) : market.length;
    return market 
        .filter(([_, market]: [string, ccxt.Market]) => market.quote == 'USDT' && market.active && !market.info.permissions.includes('LEVERAGED'))
        .map(([symbol, _]: [string, ccxt.Market]) => symbol)
        .slice(0, topCryptos);
}

export async function getMarketPrice(exchange: ccxt.Exchange, symbol: string): Promise<{bid: number, ask: number, spread: number} | undefined> {
    const orderbook: ccxt.OrderBook = await exchange.fetchOrderBook(symbol);
    const bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined;
    const ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined;
    const spread = (bid && ask) ? ask - bid : undefined
    // check the actual price atm on the exchange
    return (bid && ask && spread) ? {bid, ask, spread} : undefined;
}

export async function getFees(exchange: ccxt.Exchange, symbol: string): Promise<{taker: number, maker: number}> {
    await exchange.loadMarkets();
    return {taker: exchange.markets[symbol].taker, maker: exchange.markets[symbol].maker};
}

export async function defaultStopLossTarget(exchange: ccxt.Exchange, symbol: string, timeframe: Timeframe) 
: Promise<{stop: number, target: number}> {
    //const period = 14;
    //const samplesize = 30;
    //const ohlcvs: ccxt.OHLCV[] = await exchange.fetchOHLCV(symbol, timeframe);
    //const last14 = ohlcvs.slice(-samplesize);

    //const input = {
    //    high: last14.map((ohlcv) => ohlcv[2]),
    //    low: last14.map((ohlcv) => ohlcv[3]),
    //    close: last14.map((ohlcv) => ohlcv[4]),
    //    period
    //}

    //const atr = ATR.calculate(input);
    //return {stop: ohlcvs[ohlcvs.length-1][3] + atr[atr.length-1], target: atr[atr.length-1] * 2 + ohlcvs[ohlcvs.length-1][4]};
    const marketPrice = await getMarketPrice(exchange, symbol);
    const price = marketPrice ? marketPrice : {bid: 0};
    return {stop: price.bid - price.bid * 0.02, target: price.bid + price.bid * 0.04};
}

// Returns crypto that has potential ordered depending on strategy
export async function filterAndOrder(exchange: ccxt.Exchange, strategy: IStrategy): Promise<string[]> {
    const cryptoSymbols: string[] = await getMarketSymbols(exchange);
    return await orderMarkets(exchange, cryptoSymbols, strategy);
}

export async function orderMarkets(exchange: ccxt.Exchange, symbols: string[], strategy: IStrategy) {
    const candiates: {symbol: string, confidence: number}[] = [];
    let i = 0;
    for(let symbol of symbols) {
        console.log(i+1, "/", symbols.length);
        await sleep(exchange.rateLimit);
        await strategy.calculate(symbol);
        const confidence = strategy.getConfidenceValue();
        if(confidence < 0.5) {
            candiates.push({symbol, confidence});
        }
        i++;
    }
    candiates.sort((pairfirst, pairsecond) => pairfirst.confidence - pairsecond.confidence);
    return candiates.map((pair) => pair.symbol);
}

export function getBaseCurrency(symbol: string): string {
    return symbol.split('/')[0];
}

export function getQuoteCurrency(symbol: string): string {
    return symbol.split('/')[1];
}