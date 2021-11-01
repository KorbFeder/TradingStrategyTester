import { Exchange } from "ccxt";
import mongoose from "mongoose";
import { TradeDirection } from "./Consts/TradeDirection";
import { getBaseCurrency, getMarketSymbols } from "./helper";
import CryptoCurrencyModel, {ICryptoCurrency} from "./Models/CryptoCurrency-model";
import { LimitOrder } from "./Models/FuturePosition-interface";
import LoggingModel, { ILogging } from "./Models/Logging-model";
import OrderModel, { IOrder } from "./Models/Order-model";
import TestAccountModel, { ITestAccount, ITrade } from "./Models/TestAccount-model";
import AlertModel, { IAlert } from "./Models/Alert-model";

export const STARTING_MONEY = 100000;

export class Database {
    constructor(private instance: number = 0) {}

    async connect(instance: number) {
        let connectionString = process.env.MONGODB as string;
        this.instance = instance;
        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        });
        await CryptoCurrencyModel.create();
        await OrderModel.create();

        const cryptos = await this.loadCryptos();
        if(cryptos.length == 0) {
        //    const symbols = await getMarketSymbols(exchange);
        //    for(let symbol of symbols) {
        //        const base = getBaseCurrency(symbol);
        //        
        //        this.saveCrypto(base, 0, 0);
        //    }
        //    const quoteCrypeo = process.env.QUOTE_CURRENCY ? process.env.QUOTE_CURRENCY : 'USDT';
        //    this.saveCrypto(quoteCrypeo, STARTING_MONEY, 0);
            let mainCurrency = 'USDT';
            let envMain = process.env.QUOTE_CURRENCY;
            if(envMain) {
                mainCurrency = envMain;
            }
            await this.saveCrypto(mainCurrency, STARTING_MONEY, 0);
        }
    }

    async saveCrypto(currencyCode: string, free: number, used: number): Promise<ICryptoCurrency> {
        const crypto = new CryptoCurrencyModel({       
            _id: new mongoose.Types.ObjectId(),
            free,
            used,
            currencyCode,
            instance: this.instance
        });
        
        return await crypto.save();
    }

    async loadCryptos(): Promise<ICryptoCurrency[]> {
        const cryptos = await CryptoCurrencyModel.find();
        return cryptos.filter(crypto => crypto.instance == this.instance);
    } 

    async updateCrypto(crypto: ICryptoCurrency) {
        return await CryptoCurrencyModel.updateOne({_id: crypto._id}, crypto);
    }

    async removeCrypto(_id: mongoose.Types.ObjectId) {
        return await CryptoCurrencyModel.remove({_id});
    }

    async loadOrder(): Promise<IOrder[]> {
        const orders = await OrderModel.find();
        return orders.filter(order => order.instance == this.instance);
    }

    async saveOrder(orderType: string, symbol: string, amount: number, stops: LimitOrder[], targets: LimitOrder[], buyPrice: number) {
        const order = new OrderModel({
            _id: new mongoose.Types.ObjectId(),
            symbol,
            amount,
            buyPrice,
            stops, 
            targets,
            orderType,
            instance: this.instance
        });
        return order.save();
    }

    async updateOrder(order: IOrder) {
        return await CryptoCurrencyModel.updateOne({_id: order._id}, order);
    }

    async removeOrder(_id: mongoose.Types.ObjectId) {
        return await OrderModel.remove({_id});
    }

    async logTrade(symbol: string, usdt: number, amount: number, tradeDirection: TradeDirection) {
        const logging = new LoggingModel({
            _id: new mongoose.Types.ObjectId(),
            usdt,
            symbol,
            amount,
            tradeDirection
        })
        await logging.save()
    }

    async loadLoggedTrades(): Promise<ILogging[]> {
        return await LoggingModel.find();
    }


    // Test account for Back- and Front-Testing
    async saveTestAccount(name: string, initialBalance: number) {
        const testAccount = new TestAccountModel({
            _id: new mongoose.Types.ObjectId(),
            name,
            trades: [],
            percentageGain: [],
            balance: initialBalance, 
            pnl: 0
        })
        await testAccount.save();
    }

    async updateTestAccount(account: ITestAccount) {
        return await TestAccountModel.updateOne({_id: account._id}, account);
    }

    async loadTestAccounts(): Promise<ITestAccount[]> {
        return await TestAccountModel.find();
    }

    async removeTestAccount(_id: mongoose.Types.ObjectId) {
        return await TestAccountModel.remove({_id});
    }


    async saveAlert(symbol: string, price: number) {
        const alert = new AlertModel({
            _id: new mongoose.Types.ObjectId(),
            price,
            symbol
        })
        await alert.save();
    }

    async loadAlerts(): Promise<IAlert[]> {
        return await AlertModel.find();
    }

    async removeAlert(_id: mongoose.Types.ObjectId) {
        return await AlertModel.remove({_id});
    }

}