import { TradeDirection } from "../Consts/TradeDirection";
import { Database } from "../Database";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { ITestAccount, ITrade } from "../Models/TestAccount-model";
import { PositionSize } from "../Orders/PositionSize";
import { StopLoss } from "../Orders/StopLoss";

const ACCOUNT_PERCENTAGE: number = 0.1;

export class TestAccount {

	constructor(private db: Database, private testAccountName: string, private startingBalance: number) {
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

    public async calculatePositionSize(stopLoss: LimitOrder[], entry: number) {
        await this.create();
        const account: ITestAccount = await this.get();
        return PositionSize.calculate(account.balance, entry, stopLoss);
    }

    public async update(trade: ITrade): Promise<ITestAccount> {
        await this.create();
        const account: ITestAccount = await this.get();
		
		const balanceBefore = account.balance;

        // risk 10 percent of account as collateral
        if(trade.tradeDirection == TradeDirection.BUY) {
            const diff = trade.exitPrice * trade.lastSize - trade.breakEvenPrice * trade.lastSize;
            account.balance += diff;
        } else if(trade.tradeDirection == TradeDirection.SELL) {
            const diff = trade.breakEvenPrice * trade.lastSize - trade.exitPrice * trade.lastSize;
            account.balance += diff;
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