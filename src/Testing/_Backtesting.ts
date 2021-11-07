import { Exchange, OHLCV } from "ccxt";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IStrategy } from "../Models/Strategy-interface";
import { Database } from "../Database";
import { backTestData, CryptoTimestamp } from "./BacktestData";
import { Candlestick } from "../Consts/Candlestick";
import { ITrade } from "../Models/TestAccount-model";
import { TestAccount } from "./TestAccount";
import { FuturePosition } from "../Models/FuturePosition-interface";
import { ManagePosition } from "../Models/ManagePosition-interface";

const MIN_LENGTH = 500;
const CONFIRMATION_DATA = 100;
const MIN_TEST_DATA_SIZE = 200;

const STARTING_BALANCE = 10000;

// todo -> simular to tradingview/ maybe only 1 symbol and 1 timeframe ? 
export class _Backtesting {
    private account: TestAccount;
    constructor(
        private exchange: Exchange,
        private db: Database,
        private testAccountName: string,
        private managePosition: ManagePosition
    ) {
        this.account = new TestAccount(this.db, this.testAccountName, STARTING_BALANCE);
    }

    async testAll(timeframe: Timeframe, strategy: IStrategy): Promise<TestAccount> {
        for(let backTest of backTestData) {
            await this.simpleTest(backTest, timeframe, strategy);
        }
        return this.account;
    }

    async simpleTest(backTest: CryptoTimestamp, timeframe: Timeframe, strategy: IStrategy): Promise<TestAccount> {
        const timeDiff: number = timeToNumber(timeframe);
        const offset: number = timeDiff * (MIN_LENGTH - 1);
 
        for(let currentTime = backTest.startTimestamp.getTime(); currentTime < backTest.endTimestamp.getTime(); currentTime += offset) {
            try{
                const data: OHLCV[] = await this.exchange.fetchOHLCV(backTest.symbol, timeframe, currentTime, MIN_LENGTH);
                for(let i = MIN_TEST_DATA_SIZE; i < data.length-CONFIRMATION_DATA; i++) {
                    const testData = data.slice(0, i);
                    const confirmationData: OHLCV[] = data.slice(i-1, data.length);
                    const tradeDirection: TradeDirection = await strategy.calculate(testData, this.exchange, backTest.symbol, timeframe, currentTime, testData.length);
                    if(tradeDirection != TradeDirection.HOLD) {
                        i += 10;
                    }
                    const trade: ITrade | undefined = await this.checkResult(confirmationData, testData, backTest.symbol, tradeDirection, strategy, timeframe);
                    if(trade) {
                        await this.account.update(trade);
                    }
                }
            } catch(err) {
                console.log(err);
            }
        }
        return this.account;
    }

    private async checkResult(confirmationData: OHLCV[], testData: OHLCV[], symbol: string, tradeDirection: TradeDirection, strategy: IStrategy, timeframe: Timeframe): Promise<ITrade | undefined> {
        const buyPrice: number = confirmationData[confirmationData.length-1][Candlestick.CLOSE];
        if(tradeDirection == TradeDirection.HOLD) {
            return undefined;
        }
        if(strategy.usesDynamicExit) {
            const exit = await strategy.dynamicExit(this.exchange, symbol, timeframe, tradeDirection);
            if(exit) {
                const exitPrice = await exit.backTestExit(confirmationData);
                if(tradeDirection == TradeDirection.BUY && exitPrice != -1) {
                    // todo -> dont use close, use wicks for exits
                    if(exitPrice > buyPrice) {
                        return {tradeDirection, win: true, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    } else if(exitPrice < buyPrice) {
                        return {tradeDirection, win: false, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    }
                } else if(tradeDirection == TradeDirection.SELL && exitPrice != -1) {
                    if(exitPrice < buyPrice) {
                        return {tradeDirection, win: true, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    } else if(exitPrice > buyPrice) {
                        return {tradeDirection, win: false, date: new Date(Candlestick.timestamp(confirmationData)), breakEvenPrice: Candlestick.close(testData), exitPrice: exitPrice, symbol, lastSize: 10, firstEntry: Candlestick.close(confirmationData, 0), initialSize: 10};
                    }
                }
            } else {
                throw 'no dynamic exit specified';
            }
        } else {
            const {stops, targets} = await strategy.getStopLossTarget(testData, tradeDirection);
            // calcualte size of the position
            const size = await this.account.calculatePositionSize(stops, Candlestick.close(testData));
            stops.forEach(stop => stop.amount = stop.amount * size);
            targets.forEach(target => target.amount = target.amount * size);

            const position: FuturePosition = {
                symbol, 
                price: Candlestick.close(testData),
                buyOrderType: 'market',
                amount: stops.map(stop => stop.amount).reduce((prev, curr) => prev + curr),
                tradeDirection,
                breakEvenPrice: Candlestick.close(testData),
                stopLosses: stops,
                profitTargets: targets,
            };
            return await this.managePosition.manage(confirmationData, position);
        }
    }
}
