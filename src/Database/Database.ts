import mongoose from "mongoose";
import { TradeDirection } from "../Consts/TradeDirection";
import { FuturePosition, LimitOrder } from "../Models/FuturePosition-interface";
import LoggingModel, { ILogging } from "../Models/Logging-model";
import TestAccountModel, { ITestAccount, ITrade } from "../Models/TestAccount-model";
import AlertModel, { IAlert } from "../Models/Alert-model";
import PositionModel, { IPosition } from "../Models/Position-model";
import { WalkForwardResult } from "../Models/WalkForwardResult-interface";
import CurrWfaResultModel, { ICurrWfaResult } from "../Models/CurrWfaResult-model";

export class Database {
    constructor(private instance: number = 0) {}

    async connect(instance: number) {
        let connectionString = process.env.MONGODB as string;
        this.instance = instance;
        await mongoose.connect(connectionString);
        await PositionModel.create();
        await TestAccountModel.create();
        await LoggingModel.create();
        await AlertModel.create();
    }

    async loadPosition(): Promise<IPosition[]> {
        const orders = await PositionModel.find();
        return orders.filter(order => order.instance == this.instance);
    }

    async savePosition(futurePosition: FuturePosition) {
        const order = new PositionModel({
            _id: new mongoose.Types.ObjectId(),
            position: futurePosition,
            instance: this.instance
        });
        return order.save();
    }

    async updatePosition(position: IPosition) {
        return PositionModel.updateOne({_id: position._id}, position);
    }

    async removePosition(_id: mongoose.Types.ObjectId) {
        return await PositionModel.deleteOne({_id});
    }

    async logTrade(trade: ITrade) {
        const logging = new LoggingModel({
            _id: new mongoose.Types.ObjectId(),
            trade,
            instance: this.instance
        })
        await logging.save()
    }

    async loadLoggedTrades(): Promise<ILogging[]> {
        const logs = await LoggingModel.find();
        return logs.filter(log => log.instance == this.instance); 
    }


    // Test account for Back- and Front-Testing
    async saveTestAccount(name: string, initialBalance: number) {
        const testAccount = new TestAccountModel({
            _id: new mongoose.Types.ObjectId(),
            instance: this.instance,
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
        const testAccounts = await TestAccountModel.find();
        return testAccounts.filter(account => account.instance == this.instance);
    }

    async removeTestAccount(_id: mongoose.Types.ObjectId) {
        return await TestAccountModel.remove({_id});
    }


    async saveAlert(symbol: string, price: number) {
        const alert = new AlertModel({
            _id: new mongoose.Types.ObjectId(),
            price,
            symbol,
            instance: this.instance
        });
        await alert.save();
    }

    async loadAlerts(): Promise<IAlert[]> {
        const alerts = await AlertModel.find();
        return alerts.filter(alert => alert.instance == this.instance);
    }

    async removeAlert(_id: mongoose.Types.ObjectId) {
        return await AlertModel.remove({_id});
    }

    async setCurrWfaResult(wfaResult: WalkForwardResult) {
        // delete old wfa
        const oldWfas: ICurrWfaResult[] = await CurrWfaResultModel.find();
        await CurrWfaResultModel.deleteMany({_id: oldWfas.map((wfa) => wfa._id)});

        // save the current wfa
        const currWfa = new CurrWfaResultModel({
            _id: new mongoose.Types.ObjectId(),
            currWfaResult: wfaResult,
            instance: this.instance
        });
        await currWfa.save();
    }

    async getCurrWfaResult(): Promise<WalkForwardResult> {
        return (await CurrWfaResultModel.find())[0].currWfaResult;
    }
}