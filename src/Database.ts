import mongoose from "mongoose";
import { TradeDirection } from "./Consts/TradeDirection";
import BalanceModel, { IBalance } from "./Models/Balance-model";
import CryptoCurrencyModel, {ICryptoCurrency} from "./Models/CryptoCurrency-model";
import LoggingModel, { ILogging } from "./Models/Logging-model";
import StoppLossTargetModel, { IStoppLossTarget } from "./Models/StoppLossTarget-model";


export class Database {
    constructor() {}

    async connect() {
        await mongoose.connect(process.env.MONGODB as string, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        });
   }

    async saveCrypto(symbol: string, amount: number): Promise<ICryptoCurrency> {
        const crypto = new CryptoCurrencyModel({       
            _id: new mongoose.Types.ObjectId(),
            symbol,
            amount,
            active: true
        });
        
        return await crypto.save();
    }

    async loadCryptos(): Promise<ICryptoCurrency[]> {
        return await CryptoCurrencyModel.find();
    } 

    async updateCrypto(_id: mongoose.Types.ObjectId, crypto: ICryptoCurrency) {
        crypto.active = true;
        return await CryptoCurrencyModel.updateOne({_id}, crypto);
    }

    async removeCrypto(_id: mongoose.Types.ObjectId) {
        return await CryptoCurrencyModel.remove({_id});
    }


    async loadBalances(): Promise<IBalance[]> {
        return await BalanceModel.find();
    }

    async saveBalance(usdt: number): Promise<IBalance> {
        const balance = new BalanceModel({
            _id: new mongoose.Types.ObjectId(),
            usdt
        });
        return await balance.save();
    }

    async updateBalance(_id: mongoose.Types.ObjectId, balance: IBalance) {
        return await BalanceModel.updateOne({_id}, balance);
    }

    async loadSaveStoppLimit(): Promise<IStoppLossTarget[]> {
        return await StoppLossTargetModel.find();
    }

    async saveStoppLimit(symbol: string, amount: number, stop: number, target: number) {
        const stoppLimit = new StoppLossTargetModel({
            _id: new mongoose.Types.ObjectId(),
            symbol,
            amount,
            stop, 
            target
        });
        return stoppLimit.save();
    }

    async removeStopLimit(_id: mongoose.Types.ObjectId) {
        return await StoppLossTargetModel.remove({_id});
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
}