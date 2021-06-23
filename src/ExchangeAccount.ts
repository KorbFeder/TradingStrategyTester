import * as ccxt from "ccxt";
import { getBaseCurrency, getMarketSymbols, sleep } from "./helper";
import { ITradingAccount } from "./Models/TradingAccount-interface";

export class ExchangeAccount implements ITradingAccount {
    private buyOrders: {symbol: string, id: string}[] = [];
    private initOrders = false;
    private activeOrders: string[] = [];
    private tradeResults: boolean[] = [];

    constructor(
        private exchange: ccxt.Exchange,
    ) {}    
    

    async buy(symbol: string, amount: number, pricePerCoin: number): Promise<boolean> {
        try {
            console.log('buying: ', symbol, ' amount: ', amount, ' of price: ', pricePerCoin);
            const order = await this.exchange.createOrder(symbol, 'market', 'buy', amount, pricePerCoin);
            this.buyOrders.push({symbol, id: order.id});
            this.activeOrders.push(symbol);
        } catch(err) {
            console.log(err);
            return false;
        }
        return true;
    }

    async sellStopLossTarget(symbol: string, stop: number, target: number): Promise<boolean> {
        // check if the buying order is still getting processed or if it got closed yet
        const orders = await this.exchange.fetchOpenOrders(symbol);
        if(orders.length > 0) {
            return false;
        }

        try{
            const amount: number = (await this.getBalance(getBaseCurrency(symbol))).free;
            console.log('buying: ', symbol, ' amount: ', amount, ' of price: ', stop, target);
            await this.exchange.createOrder(symbol, 'limit', 'sell', amount, target);
            await this.exchange.createOrder(symbol, 'limit', 'buy', amount, stop);
        } catch(err) {
            console.log(err);
            return false
        }
        return true;
    }

    async getBalance(currencyCode: string): Promise<{free: number, used: number}> {
        const balance: ccxt.Balances = await this.exchange.fetchBalance();
        if(balance[currencyCode]) {
            return {free: balance[currencyCode].free, used: balance[currencyCode].used};
        }
        return {free: -1, used: -1};
    }

    private async openOrders() {
        const symbols = await getMarketSymbols(this.exchange);
        const orders: ccxt.Order[] = [];

        for(let symbol of symbols) {
            await sleep(this.exchange.rateLimit);
            const order = await this.exchange.fetchOpenOrders(symbol);
            if (order.length != 0) {
                orders.concat(order);
            }
        }

        return orders.map((order) => order.symbol);
    }


    async getOpenOrdersCount(): Promise<number> {
        if(!this.initOrders) {
            this.activeOrders = await this.openOrders();
        }
        for(let symbol of this.activeOrders) {
            const orders = await this.exchange.fetchOpenOrders(symbol);
            if(orders.length == 0) {
                this.activeOrders = this.activeOrders.filter((order) => order != symbol);
            }
        }
        return this.activeOrders.length;
    }

    async isSameTradeInProcess(symbol: string): Promise<boolean> {
        const openOrders = await this.exchange.fetchOpenOrders(symbol);
        return openOrders.length > 0;
    }

    async getOldBuyOrders(): Promise<{ symbol: string; stop: number; target: number; }[]> {
        return [];
    }


    getTradeResults(): boolean[] {
        // todo make this work
        return this.tradeResults;
    }
}