import * as ccxt from "ccxt";
import { ATR } from "technicalindicators";
import { Timeframe } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { IStrategy } from "./Models/Strategy-interface";

export function sleep(ms: number) {
    new Promise(resolve => setTimeout (resolve, ms));
}

// function that returns all market symbols that are traded against usdt
export async function getMarketSymbols(exchange: ccxt.Exchange): Promise<string[]> {
    if(process.env.GET_SYMBOLS_FROM_EXCHANGE == '1') {
        await exchange.loadMarkets();
        const market = Object.entries(exchange.markets);
        const topCryptos: number = process.env.TOP_CRYPTOS ? parseInt(process.env.TOP_CRYPTOS) : market.length;
        if(exchange.id == 'ftx') {
            return market 
            .filter(([_, market]: [string, ccxt.Market]) => market.type == 'future' && market.id.includes('PERP'))
            //.filter(([_, market]: [string, ccxt.Market]) => market.quote == 'USDT')
            .map(([symbol, _]: [string, ccxt.Market]) => symbol)
            .slice(0, topCryptos);
        }
        return market 
            //.filter(([_, market]: [string, ccxt.Market]) => market.type == 'future' && market.id.includes('PERP'))
            .filter(([_, market]: [string, ccxt.Market]) => market.quote == 'USDT')
            .map(([symbol, _]: [string, ccxt.Market]) => symbol)
            .slice(0, topCryptos);
    } else {
        return ['BTC-PERP', 'ETH-PERP', 'MATIC-PERP', 'SOL-PERP', 'DOT-PERP', 'LINK-PERP', 'BNB-PERP', 'ADA-PERP', 
            'LTC-PERP', 'DOGE-PERP', 'FTT-PERP', 'RUNE-PERP', 'SUSHI-PERP', 'AAVE-PERP', 'XRP-PERP', 'UNI-PERP', 
            'BCH-PERP', 'THETA-PERP', 'VET-PERP', 'XMR-PERP', 'TRX-PERP', ];
        //return ['BTC-PERP', 'ETH-PERP'];
    }
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

export function getBaseCurrency(symbol: string): string {
    if(symbol.includes('-PERP')) {
        return symbol.split('-')[0];
    }
    return symbol.split('/')[0];
}

export function getQuoteCurrency(symbol: string): string {
    if(symbol.includes('-PERP')) {
        return 'USDT';
    }
    return symbol.split('/')[1];
}

// line B ___   ___ line A
//           \ /
//            X
// line A ___/ \___ line B
export function CrossUpside(lineA: number[], lineB: number[]): boolean {
    enum crossState {
        INIT, BELOW, 
    }
    let state: crossState = crossState.INIT;
    for(let i = 0; i < lineA.length; i++) {
        switch(state) {
            case crossState.INIT: 
                if(lineA[i] < lineB[i]) {
                    state = crossState.BELOW;
                }
                break;
            case crossState.BELOW: 
                if(lineA[i] > lineB[i]) {
                    return true;
                }
                break;
        }
    }
    return false;
}