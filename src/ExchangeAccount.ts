import * as ccxt from "ccxt";
import { Timeframe } from "./Consts/Timeframe";
import { filterAndOrder, sleep } from "./helper";
import { ITradingAccount, OrderStatus } from "./Models/TradingAccount-interface";
import { RsiStrategy } from "./Strategies/RsiStrategy";

export class ExchangeAccount implements ITradingAccount {

    constructor(
        private exchange: ccxt.Exchange
    ) {}    

    async getOrderStatus(id: string, symbol: string): Promise<OrderStatus> {
        const order = await this.exchange.fetchOrder(id, symbol);
        if(order.status == 'closed') {
            return OrderStatus.CLOSE;
        } else if(order.status == 'open') {
            return OrderStatus.OPEN;
        } else {
            return OrderStatus.CANCELED;
        }
    }

    async buy(symbol: string, amount: number, pricePerCoin: number): Promise<string> {
        console.log('buying: ', symbol, ' amount: ', amount, ' of price: ', pricePerCoin);
        const order = await this.exchange.createOrder(symbol, 'market', 'buy', amount, pricePerCoin);
        return order.id;
    }

    async sellStopLossTarget(symbol: string, amount: number, stop: number, target: number): Promise<{stopId: string, targetId: string} | undefined> {
        console.log('buying: ', symbol, ' amount: ', amount, ' of price: ', stop, target);
        const targetOrder = await this.exchange.createOrder(symbol, 'limit', 'sell', amount, target);
        const stopOrder = await this.exchange.createOrder(symbol, 'limit', 'buy', amount, stop);
        return {stopId: stopOrder.id, targetId: targetOrder.id};
    }

    async getBalance(currencyCode: string): Promise<{free: number, used: number}> {
        const balance: ccxt.Balances = await this.exchange.fetchBalance();
        if(balance[currencyCode]) {
            return {free: balance[currencyCode].free, used: balance[currencyCode].used};
        }
        return {free: -1, used: -1};
    }

    async getAllOpenOrders(): Promise<string[]> {
        const symbols = await filterAndOrder(this.exchange, new RsiStrategy(this.exchange, Timeframe.m15));
        const orders: ccxt.Order[] = [];

        for(let symbol of symbols) {
            await sleep(this.exchange.rateLimit)
            const order = await this.exchange.fetchOrders(symbol);
            if (order.length != 0) {
                orders.concat(order);
            }
        }

        return orders.filter((order) => order.status == 'open').map((order) => order.id);
    }

    async getOpenOrders(symbol: string): Promise<string[]> {
        const orders = await this.exchange.fetchOpenOrders(symbol);
        return orders.map((order) => order.id);
    }
}