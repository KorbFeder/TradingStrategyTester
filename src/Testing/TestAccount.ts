import { Exchange } from "ccxt";
import { TradeDirection } from "../Consts/TradeDirection";
import { Database } from "../Database/Database";
import { getFeesForTrade } from "../helpers/getFeesForTrade";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { ITestAccount, ITrade } from "../Models/TestAccount-model";
import { PositionSize } from "../Orders/PositionSize";

const ACCOUNT_PERCENTAGE: number = 0.1;

export class TestAccount {

	constructor(
        private db: Database, 
        private testAccountName: string, 
        private startingBalance: number,
    ) {
	}

    private async create() {
        const testAccopunts: ITestAccount[] = await this.db.loadTestAccounts();
        let account = testAccopunts.filter(account => account.name == this.testAccountName);
        if(account.length == 0) {
            await this.db.saveTestAccount(this.testAccountName, this.startingBalance);
        } 
    }
    
    public async get(): Promise<ITestAccount> {
        const testAccopunts: ITestAccount[] = await this.db.loadTestAccounts();
        let account = testAccopunts.filter(account => account.name == this.testAccountName);
        if(account.length == 0) {
            throw "no test account created yet with the name: " + this.testAccountName;
        }
        return account[0];
    }

    public async getBalance(): Promise<number> {
        await this.create();
        const testAccount: ITestAccount = await this.get();
        return testAccount.balance;
 
    }

    public async getTrades(symbol: string): Promise<ITrade[]> {
        await this.create();
        const testAccount: ITestAccount = await this.get();
        return testAccount.trades.filter(trade => trade.symbol == symbol);       
    }

    public async calculatePositionSize(stopLoss: LimitOrder[], entry: number) {
        await this.create();
        const account: ITestAccount = await this.get();
        return PositionSize.calculate(account.balance, entry, stopLoss);
    }
    
    public async update(trade: ITrade, exchange: Exchange, fees: boolean): Promise<ITestAccount> {
        await this.create();
        const account: ITestAccount = await this.get();
        let allFees = 0;
        if(fees) {
            allFees = getFeesForTrade(trade, exchange);
        }
		
		const balanceBefore = account.balance;

        if(trade.tradeDirection == TradeDirection.BUY) {
            const diff = trade.exitPrice * trade.lastSize - trade.breakEvenPrice * trade.lastSize - allFees;
            account.balance += diff;
        } else if(trade.tradeDirection == TradeDirection.SELL) {
            const diff = trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize - allFees;
            account.balance += diff;
        }

        if(account.balance <= 0) {
            throw "liquidated account balance dropped below 0, balance: " + account.balance;
        }

        account.percentageGain.push((trade.initialSize * trade.firstEntry + (account.balance - balanceBefore)) / (trade.initialSize * trade.firstEntry));
		account.pnl += account.balance - balanceBefore;
        account.trades.push(trade);
		await this.db.updateTestAccount(account);
        return await this.get();
    }

    public async printStatistics() {
        await this.create();
        const testAccount: ITestAccount = await this.get();
        let wins = 0;
        let loses = 0;
        const symbolCount: Map<string, number> = new Map();
        for(let trade of testAccount.trades) {
            const num: number | undefined = symbolCount.get(trade.symbol);
            if(num) {
                symbolCount.set(trade.symbol, num + 1);
            } else {
                symbolCount.set(trade.symbol, 1);
            }
            if(trade.win) {
                wins++;
            } else {
                loses++;
            }
        }

        console.log('traded on symbol with count:', symbolCount);
        //console.log('trades:', testAccount.trades);
        console.log('percentageDiff:', testAccount.percentageGain.map(percentage => (percentage - 1).toFixed(4)));
        console.log('wins:', wins, 'loses:', loses, 'winrate:', wins / (wins + loses));
        console.log('balance:', testAccount.balance);
        console.log('pnl', testAccount.pnl);
        console.log('account gain:', testAccount.balance / (testAccount.balance - testAccount.pnl));
    }
}