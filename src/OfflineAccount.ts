import * as ccxt from "ccxt";
import { TradeDirection } from "./Consts/TradeDirection";
import { Database } from "./Database";
import { getBaseCurrency, getMarketPrice, getQuoteCurrency } from "./helper";
import { ITradingAccount, OrderStatus } from "./Models/TradingAccount-interface";

const FEE = 0.001
const CURRENT_BALANCE = "currentBalance"

// todo -> remove balance and balance db and use balance from binance portfolio
export class OfflineAccount implements ITradingAccount {
    constructor(
        private exchange: ccxt.Exchange,
        private db: Database,
    ) {}

    // price in quote currency
    async buy(symbol: string, amount: number, pricePerCoin: number): Promise<string | undefined> {
        const cryptos = await this.db.loadCryptos();
        const quote = getQuoteCurrency(symbol);
        const base = getBaseCurrency(symbol);
        const quoteCrypto = cryptos.filter((crypto) => crypto.currencyCode == quote)[0];
        const baseCrypto = cryptos.filter((crypto) => crypto.currencyCode == base)[0];
        const cost = amount * pricePerCoin;
        const costWithFee = cost + cost * FEE;

        if(quoteCrypto.free - costWithFee < 0) {
            console.log('not enough money to buy');
            return undefined;
        }

        quoteCrypto.free -= costWithFee;
        baseCrypto.free += amount;

        await this.db.updateCrypto(baseCrypto);
        await this.db.updateCrypto(quoteCrypto);
        await this.db.logTrade(symbol, costWithFee, amount, TradeDirection.BUY);
        console.log('bought', symbol);
        return (await this.db.saveOrder('limit', symbol, amount, pricePerCoin, pricePerCoin))._id.toHexString();
    }

    async sellStopLossTarget(symbol: string, amount: number, stop: number, target: number): Promise<{ stopId: string; targetId: string; }  | undefined> {
        const price = await getMarketPrice(this.exchange, symbol);
        if(price) {
            console.log('testing', symbol, 'with currprices: ', price.bid, 'stoptarget:', stop, target);
            if(price.bid < stop) {
                await this.sell(symbol, amount, stop);
                const orderId = (await this.db.loadOrder()).filter((order) => order.symbol == symbol)[0]._id;
                this.db.removeOrder(orderId);
            } else if(price.bid >= target) {
                await this.sell(symbol, amount, target);
                const orderId = (await this.db.loadOrder()).filter((order) => order.symbol == symbol)[0]._id;
                this.db.removeOrder(orderId);
            }
        }
        return undefined;
    }

    private async sell(symbol: string, amount: number, pricePerCoin: number): Promise<boolean> {
        const cryptos = await this.db.loadCryptos();
        const quote = getQuoteCurrency(symbol);
        const base = getBaseCurrency(symbol);
        const quoteCrypto = cryptos.filter((crypto) => crypto.currencyCode == quote)[0];
        const baseCrypto = cryptos.filter((crypto) => crypto.currencyCode == base)[0];
        const gain = amount * pricePerCoin;
        const gainWithFee = gain - gain * FEE;

        if(baseCrypto.free - amount < 0) {
            return false;
        }

        quoteCrypto.free += gainWithFee;
        baseCrypto.free -= amount;

        await this.db.updateCrypto(baseCrypto);
        await this.db.updateCrypto(quoteCrypto);
        await this.db.logTrade(symbol, gainWithFee, amount, TradeDirection.SELL);
        console.log('selling', symbol);
        return true;
    }

    async getBalance(currencyCode: string): Promise<{ free: number; used: number; }> {
        const cryptos = await this.db.loadCryptos();
        const balance = cryptos.filter((crypto) => crypto.currencyCode == currencyCode)[0];
        return {free: balance.free, used: balance.used};
    }

    async getOpenOrders(symbol: string): Promise<string[]> {
        const orders = await this.db.loadOrder();
        return orders.filter((order) => order.symbol == symbol).map((order) => order._id.toString());
    }

    async getOrderStatus(id: string, symbol: string): Promise<OrderStatus> {
        const orders = await this.db.loadOrder();
        if(orders.filter((order) => order.symbol == symbol).length != 0) {
            return OrderStatus.CLOSE;
        } else {
            return OrderStatus.CANCELED;
        }
    }

    async getAllOpenOrders(): Promise<string[]> {
        const orders = await this.db.loadOrder();
        return orders.map((order) => order._id.toHexString());
    }
}