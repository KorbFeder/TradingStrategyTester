import * as ccxt from "ccxt";
import { TradeDirection } from "./Consts/TradeDirection";
import { Database, STARTING_MONEY } from "./Database";
import { getBaseCurrency, getMarketPrice, getMarketSymbols, getQuoteCurrency } from "./helper";
import { ITradingAccount } from "./Models/TradingAccount-interface";

const FEE = 0.001

// todo -> remove balance and balance db and use balance from binance portfolio
export class OfflineAccount implements ITradingAccount {
    private tradeResults: boolean[] = [];

    constructor(
        private exchange: ccxt.Exchange,
        private db: Database,
    ) {}

    // price in quote currency
    async buy(symbol: string, amount: number, pricePerCoin: number): Promise<boolean> {
        const cryptos = await this.db.loadCryptos();
        const quote = getQuoteCurrency(symbol);
        const base = getBaseCurrency(symbol);
        const quoteCrypto = cryptos.filter((crypto) => crypto.currencyCode == quote)[0];
        const baseCrypto = cryptos.filter((crypto) => crypto.currencyCode == base)[0];
        const cost = amount * pricePerCoin;
        const costWithFee = cost + cost * FEE;

        if(quoteCrypto.free - costWithFee < 0) {
            console.log('not enough money to buy');
            return false;
        }

        quoteCrypto.free -= costWithFee;
        baseCrypto.free += amount;

        await this.db.updateCrypto(baseCrypto);
        await this.db.updateCrypto(quoteCrypto);
        await this.db.logTrade(symbol, costWithFee, amount, TradeDirection.BUY);
        console.log('bought', symbol);
        await this.db.saveOrder('limit', symbol, amount, pricePerCoin - pricePerCoin * 0.02, pricePerCoin + pricePerCoin * 0.04);
        return true;
    }

    async sellStopLossTarget(symbol: string, stop: number, target: number): Promise<boolean> {
        console.log('current account value: ', await this.getTotalBalance(), 'of ', STARTING_MONEY);
        const cryptos = await this.db.loadCryptos();
        const price = await getMarketPrice(this.exchange, symbol);

        // save stop target for restarts 
        const order = (await this.db.loadOrder()).filter((order) => order.symbol == symbol)[0];
        order.stop = stop;
        order.target = target;
        await this.db.updateOrder(order);

        if(price) {
            console.log('testing', symbol, 'with currprices: ', price.bid, 'stoptarget:', stop, target);
            if(price.bid < stop) {
                console.log('selling', symbol, 'at stop');
                const filtered = cryptos.filter((crypto) => crypto.currencyCode == getBaseCurrency(symbol))
                const mapped = filtered.map((crypto) => crypto.free);
                const amount = mapped[0];
                if(!(await this.sell(symbol, amount, stop))) {
                    return false;
                }
                const orderId = (await this.db.loadOrder()).filter((order) => order.symbol == symbol)[0]._id;
                this.db.removeOrder(orderId);
                this.tradeResults.push(false);
                return true;
            } else if(price.bid >= target) {
                console.log('selling', symbol, 'at target');
                const filtered = cryptos.filter((crypto) => crypto.currencyCode == getBaseCurrency(symbol))
                const mapped = filtered.map((crypto) => crypto.free);
                const amount = mapped[0];
                if(!(await this.sell(symbol, amount, target))) {
                    return false;
                }
                const orderId = (await this.db.loadOrder()).filter((order) => order.symbol == symbol)[0]._id;
                this.db.removeOrder(orderId);
                this.tradeResults.push(true);
                return true;
            }
        }
        return false;
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

    async getOpenOrdersCount(): Promise<number> {
        const orders = await this.db.loadOrder();
        return orders.length
    }

    async isSameTradeInProcess(symbol: string): Promise<boolean> {
        const orders = await this.db.loadOrder();
        if(orders.filter((order) => order.symbol == symbol).length > 0) {
            return true;
        }
        return false;
    }

    async getTotalBalance(): Promise<number> {
        const cryptos = await this.db.loadCryptos();
        let totalValue = 0;
        for(let crypto of cryptos) {
            if(crypto.free != 0) {
                if(crypto.currencyCode == "USDT") {
                    totalValue += crypto.free;
                    break;
                }
                const price = await getMarketPrice(this.exchange, crypto.currencyCode + "/USDT");
                const endPrice = price ? price : {bid: 0};
                totalValue += endPrice.bid * crypto.free;
            }
        }
        return totalValue;
    }

    getTradeResults(): boolean[] {
        const results = [...this.tradeResults];
        this.tradeResults = [];
        return results;
    }

    async getOldBuyOrders(): Promise<{ symbol: string; stop: number; target: number; }[]> {
        const orders = (await this.db.loadOrder()).map((order) => {
            return {symbol: order.symbol, stop: order.stop, target: order.target}
        });
        return orders;
    }
}