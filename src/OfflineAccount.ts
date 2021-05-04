import * as ccxt from "ccxt";
import { Database } from "./Database";
import { getFees, getMarketPrice } from "./helper";
import { IBalance } from "./Models/Balance-model";
import { ICryptoCurrency } from "./Models/CryptoCurrency-model";
import { TradeDirection } from "./Consts/TradeDirection";
import { ITradingAccount, OrderStatus } from "./Models/TradingAccount-interface";
import { Timeframe } from "./Consts/Timeframe";
import StoppLossTargetModel, { IStoppLossTarget } from "./Models/StoppLossTarget-model";

export interface Order {
    id: string,
    symbol: string,
    status: OrderStatus
};

// todo -> remove balance and balance db and use balance from binance portfolio
export class OfflineAccount implements ITradingAccount {
    private id = 0;
    public initalTradingVolumn: number = 100000;
    private cryptos: ICryptoCurrency[] = [];
    private stopLossTarget: IStoppLossTarget[] = [];
    private balances: IBalance[] = [];
    private orders: Order[] = [];

    constructor(
        private exchange: ccxt.Exchange,
        private balanceNr: number = 0,
        private db: Database,
        private timeframe: Timeframe
    ) {}
    

    async init(symbols: string[]) {
        await this.db.connect();
        this.balances = await this.db.loadBalances();
        if (this.balances.length == 0) {
            // todo -> add more balances for parallel trading for different accounts
            this.balances.push(await this.db.saveBalance(this.initalTradingVolumn));
        }
        this.cryptos = await this.db.loadCryptos();
        if (this.cryptos.length == 0) {
            for(let symbol of symbols){
                this.cryptos.push(await this.db.saveCrypto(symbol, 0));
            }           
        } else {
            const loaded_symbols: string[] = this.cryptos.map((crypto) => crypto.symbol);

            // check for new coins
            for(let symbol of symbols) {
                if(!loaded_symbols.includes(symbol)) {
                    this.cryptos.push(await this.db.saveCrypto(symbol, 0));
                }
            }

            // check for inactive coins or renames are in database left
            for(let symbol of loaded_symbols) {
                if(!symbols.includes(symbol)) {
                    // mark the crypto as inactive
                    for(let crypto of this.cryptos) {
                        if(crypto.symbol == symbol) {
                            crypto.active = false;
                            await this.db.updateCrypto(crypto._id, crypto);
                        }
                    }
                }
            }
        } 
    }

    async buy(symbol: string, amount: number, pricePerCoin: number): Promise<string> {
        let index = -1;
        this.cryptos.forEach((crypto, i) => {
            if (crypto.symbol == symbol) {
                index = i;
            }
        });

        if(index == -1) {
            throw "could not find crypto symbol in loaded cryptos";
        }

        const tradingCostPercent = await getFees(this.exchange, symbol);
        const coinPrice: number = amount * pricePerCoin;
        const tradingCost: number = coinPrice * tradingCostPercent.taker;
        const price = coinPrice + tradingCost;

        if(price > this.balances[this.balanceNr].usdt) {
            return '';
        }

        this.balances[this.balanceNr].usdt -= price;
        this.cryptos[index].amount += amount;
        this.id++;

        // update the database
        await this.db.updateBalance(this.balances[this.balanceNr]._id, this.balances[this.balanceNr]);
        await this.db.updateCrypto(this.cryptos[index]._id, this.cryptos[index]);
        await this.db.logTrade(symbol, price, amount, TradeDirection.BUY);
        this.orders.push({id: this.id.toString(), symbol, status: OrderStatus.CLOSE});
        return this.id.toString();
    }

    

    async sellStopLossTarget(symbol: string, amount: number, stop: number, target: number): Promise<{stopId: string | undefined, targetId: string | undefined} > {
        this.stopLossTarget = await this.db.loadSaveStoppLimit();
        const current = this.stopLossTarget.filter((stopLoss) => symbol == symbol);
        if(current.length > 0) {
            return {stopId: undefined, targetId: undefined}
        }
        const marketPrice = await getMarketPrice(this.exchange, symbol);
        if(marketPrice){
            if (marketPrice.bid >= target) {
                if(await this.sell(symbol, amount, marketPrice.bid)) {
                    this.db.removeStopLimit(current[0]._id);
                    return {stopId: '1', targetId: '1'}
                }
            } else if (marketPrice.ask <= stop) {
                if(await this.sell(symbol, amount, marketPrice.ask)) {
                    this.db.removeStopLimit(current[0]._id);
                    return {stopId: '1', targetId: '1'}
                }
            }
        }
        return {stopId: undefined, targetId: undefined}
    }

    async getBalance(symbol: string): Promise<{free: number, used: number}> {
        if(symbol == 'USDT') {
            return {free: this.balances[this.balanceNr].usdt, used: 0};
        }
        return {free: (await this.getCrypto(symbol)).amount, used: 0};
    } 
    
    async getCrypto(symbol: string): Promise<ICryptoCurrency> {
        return this.cryptos.filter((crypto) => crypto.symbol == symbol)[0];
    }

    async getOpenOrders(symbol: string): Promise<string[]> {
        return this.orders
            .filter((order) => order.symbol == symbol && order.status == OrderStatus.OPEN)
            .map((order) => order.id);
    }

    async getOrderStatus(id: string, symbol: string): Promise<OrderStatus> {
        const order = this.orders.filter((order) => order.id == id && order.symbol == symbol);
        return order[0].status;
    }
    
    async getAllOpenOrders(): Promise<string[]> {
        return this.orders.filter((order) => order.status == OrderStatus.OPEN).map((order) => order.id);
    }


    async sell(symbol: string, amount: number, pricePerCoin: number): Promise<boolean> {
        let index = -1;
        this.cryptos.forEach((crypto, i) => {
            if (crypto.symbol == symbol) {
                index = i;
            }
        });

        if(index == -1) {
            throw "could not find crypto symbol in loaded cryptos";
        }

        const tradingCostPercent = await getFees(this.exchange, symbol);
        const coinPrice: number = amount * pricePerCoin;
        const tradingCost: number = coinPrice * tradingCostPercent.maker;
        const price = coinPrice - tradingCost;

        this.balances[this.balanceNr].usdt += price;
        this.cryptos[index].amount -= amount;

        // update the database
        await this.db.updateBalance(this.balances[this.balanceNr]._id, this.balances[this.balanceNr]);
        await this.db.updateCrypto(this.cryptos[index]._id, this.cryptos[index]);
        await this.db.logTrade(symbol, price, amount, TradeDirection.SELL);
        return true;
    }
}