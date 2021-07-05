import { Exchange } from "ccxt";
import mongoose from "mongoose";
import { TradeDirection } from "./Consts/TradeDirection";
import { getBaseCurrency, getMarketSymbols } from "./helper";
import CryptoCurrencyModel, {ICryptoCurrency} from "./Models/CryptoCurrency-model";
import LoggingModel, { ILogging } from "./Models/Logging-model";
import OrderModel, { IOrder } from "./Models/Order-model";
import TestResultsModel, { ITestResults } from "./Models/TestResults-model";

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

    async saveOrder(orderType: string, symbol: string, amount: number, stop: number, target: number, buyPrice: number) {
        const order = new OrderModel({
            _id: new mongoose.Types.ObjectId(),
            symbol,
            amount,
            buyPrice,
            stop, 
            target,
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
            _id: new mongoose.Types.ObjectId,
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

    async updateTestResult(testResult: ITestResults) {
        return await TestResultsModel.updateOne({_id: testResult._id}, testResult);
    }

    async saveTestResult(name: string, timeframe: string, winsLong: number, losesLong: number, winsShort: number, losesShort: number, winrate: number) {
        if(!winrate) {
            winrate = 0;
        }
        return new TestResultsModel({
            _id: new mongoose.Types.ObjectId,
            name, timeframe, winsLong, losesLong, winsShort, losesShort, winrate
        }).save();
    }

    async loadTestResult(): Promise<ITestResults[]> {
        return await TestResultsModel.find();
    }
}