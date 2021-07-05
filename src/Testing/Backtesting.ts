import { Exchange, OHLCV } from "ccxt";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IStrategy } from "../Models/Strategy-interface";
import { Database } from "../Database";
import { backTestData, CryptoTimestamp } from "./BacktestData";
import { Candlestick } from "../Consts/Candlestick";

const MIN_LENGTH = 500;
const CONFIRMATION_DATA = 100;
const MIN_TEST_DATA_SIZE = 200;

export interface TestResult {
    winsLong: number;
    losesLong: number;
    winsShort: number;
    losesShort: number;
    winrate: number;
    timeframe: Timeframe;
}
// todo -> simular to tradingview/ maybe only 1 symbol and 1 timeframe ? 
export class Backtesting {
    constructor(
        private exchange: Exchange,
        private db: Database
    ) {}

    async testAll(timeframe: Timeframe, strategy: IStrategy, name: string): Promise<TestResult> {
        let _result: TestResult = {
            winsLong: 0,
            losesLong: 0,
            winsShort: 0,
            losesShort: 0,
            winrate: 0,
            timeframe: timeframe
        };
        for(let backTest of backTestData) {
            const result = await this.simpleTest(backTest, timeframe, strategy);
            _result = this.addToResult(result, _result)
            console.log(result);
        }
        await this.db.saveTestResult(name + ' ' , timeframe, _result.winsLong, _result.losesLong, _result.winsShort, _result.losesShort, _result.winrate);
        return _result;
    }

    async simpleTest(backTest: CryptoTimestamp, timeframe: Timeframe, strategy: IStrategy): Promise<TestResult> {
        const timeDiff: number = timeToNumber(timeframe);
        const offset: number = timeDiff * (MIN_LENGTH - 1);
 
        let result: TestResult = {winsLong: 0, winsShort: 0, losesShort: 0, losesLong: 0, winrate: 0, timeframe};
        for(let currentTime = backTest.startTimestamp.getTime(); currentTime < backTest.endTimestamp.getTime(); currentTime += offset) {
            try{
                const data: OHLCV[] = await this.exchange.fetchOHLCV(backTest.symbol, timeframe, currentTime, MIN_LENGTH);
                for(let i = MIN_TEST_DATA_SIZE; i < data.length-CONFIRMATION_DATA; i++) {
                    const testData = data.slice(0, i);
                    if(testData[testData.length-1][Candlestick.TIMESTAMP] == 1624356600000 || i == 166) {
                        console.log('test');
                    }
                    const confirmationData: OHLCV[] = data.slice(i-1, data.length);
                    const tradeDirection: TradeDirection = await strategy.calculate(testData, this.exchange, backTest.symbol, timeframe, currentTime, testData.length);
                    if(tradeDirection != TradeDirection.HOLD) {
                        i += 10;
                    }
                    result = this.addToResult(result, await this.checkResult(confirmationData, testData, backTest.symbol, tradeDirection, strategy, timeframe));
                }
            } catch(err) {
                console.log(err);
            }
        }
        return result;
    }

    private async checkResult(confirmationData: OHLCV[], testData: OHLCV[], symbol: string, tradeDirection: TradeDirection, strategy: IStrategy, timeframe: Timeframe): Promise<TestResult> {
        const buyPrice: number = confirmationData[confirmationData.length-1][Candlestick.CLOSE];
        if(tradeDirection == TradeDirection.HOLD) {
            return {winsLong: 0, winsShort: 0, losesShort: 0, losesLong: 0, winrate: 0, timeframe};
        }
        if(strategy.usesDynamicExit) {
            const result: TestResult = {winsLong: 0, winsShort: 0, losesShort: 0, losesLong: 0, winrate: 0, timeframe};
            const exit = await strategy.dynamicExit(this.exchange, symbol, timeframe, tradeDirection);
            if(exit) {
                const exitPrice = await exit.backTestExit(confirmationData);
                if(tradeDirection == TradeDirection.BUY && exitPrice != -1) {
                    if(exitPrice > buyPrice) {
                        result.winsLong++;
                    } else if(exitPrice < buyPrice) {
                        result.losesLong++;
                    }
                } else if(tradeDirection == TradeDirection.SELL && exitPrice != -1) {
                    if(exitPrice < buyPrice) {
                        result.winsShort++;
                    } else if(exitPrice > buyPrice) {
                        result.losesShort++;
                    }
                }
                return result;
            } else {
                throw 'no dynamic exit specified';
            }
        } else {
            const result: TestResult = {winsLong: 0, winsShort: 0, losesShort: 0, losesLong: 0, winrate: 0, timeframe};
            const {stop, target} = await strategy.getStopLossTarget(testData, tradeDirection);
            for(let i = 0; i < confirmationData.length; i++) {
                if(tradeDirection == TradeDirection.BUY) {
                    if(confirmationData[i][Candlestick.LOW] < stop) {
                        result.losesLong++;
                        break;
                    } else if(confirmationData[i][Candlestick.HIGH] > target) {
                        result.winsLong++;
                        break;
                    }
                } else if(tradeDirection == TradeDirection.SELL) {
                    if(confirmationData[i][Candlestick.HIGH] > stop) {
                        result.losesShort++;
                        break;
                    } else if(confirmationData[i][Candlestick.LOW] < target) {
                        result.winsShort++;
                        break;
                    }
                }
            }
            return result;
        }
    }

    private addToResult(testResultOld: TestResult, testResultNew: TestResult): TestResult {
        testResultOld.losesLong += testResultNew.losesLong;
        testResultOld.losesShort += testResultNew.losesShort;
        testResultOld.winsLong += testResultNew.winsLong;
        testResultOld.winsShort += testResultNew.winsShort;
        return this.calcWinRate(testResultOld);
    }

    private calcWinRate(result: TestResult): TestResult {
        const allTrades: number = (result.winsLong + result.winsShort + result.losesLong + result.losesShort);
        if(allTrades == 0) {
            result.winrate = 0;
            return result;
        }
        result.winrate = (result.winsLong + result.winsShort) / allTrades;
        return result;
    }
}

//export class Backtesting {
//    private testResults: TestResult[] = [];
//
//    constructor(private exchange: Exchange) {}
//
//    async chunkTesting(strategy: IStrategy): Promise<TestResult[]> {
//        try {
//            // interesting timeframes
//            const timeframes: Timeframe[] = [Timeframe.m1];
//            const clonedStrategies: IStrategy[] = this.cloneStrategy(timeframes.length, strategy);
//            const symbols = await getMarketSymbols(this.exchange);
//            this.testResults = [];
//
//            for(let t = 0; t < timeframes.length; t++) {
//                const result: TestResult = {
//                    balance: DEFAULT_BALANCE,
//                    winsLong: 0,
//                    losesLong: 0,
//                    winsShort: 0,
//                    losesShort: 0,
//                    winrate: 0,
//                    timeframe: timeframes[t]
//                };
//
//                let loopcount = 0;
//                for(let symbol of symbols) {
//                    try {
//                        const monthData = await this.exchange.fetchOHLCV(symbol, Timeframe.Mo1);
//                        const firstTimeUTC = monthData[0][0];
//                        const dataForDiff: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframes[t]);
//                        const timeDiff = dataForDiff[dataForDiff.length - 1][0] - dataForDiff[0][0];
//
//                        for(let i = 1; (Date.now() - timeDiff * i) - firstTimeUTC  - timeDiff * RAND_OFFSET> 0; i++) {
//                            const randOffset: number = random(0, RAND_OFFSET);
//
//                            const data: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframes[t], Math.floor((Date.now() - timeDiff * i) - timeDiff * randOffset));
//                            if(data.length < MIN_LENGTH) {
//                                continue;
//                            }
//
//                            const {testData, validationData} = this.createDataChunks(DATA_CHUNKS, data);
//
//                            for(let i = 0; i < testData.length; i++) {
//                                const tradeDirection: TradeDirection = await clonedStrategies[t].calculate(testData[i]);
//                                if(tradeDirection == TradeDirection.BUY) {
//                                    const {stop, target} = await clonedStrategies[t].getStopLossTarget(testData[i], TradeDirection.BUY);
//                                    const balanceDiff = this.checkResultLong(validationData[i], stop, target, testData[i][testData.length-1][4]);
//                                    if(balanceDiff > 1) {
//                                        result.winsLong++;
//                                    } else {
//                                        result.losesLong++;
//                                    }
//                                } else if (tradeDirection == TradeDirection.SELL) {
//                                    const {stop, target} = await clonedStrategies[t].getStopLossTarget(testData[i], TradeDirection.SELL);
//                                    const balanceDiff = this.checkResultShort(validationData[i], stop, target, testData[i][testData.length-1][4])
//                                    if(balanceDiff > 1) {
//                                        result.winsShort++;
//                                    } else {
//                                        result.losesShort++;
//                                    }
//                                }
//                            }
//                        }
//                        loopcount++;
//                        console.log(loopcount, '/', symbols.length);
//                    } catch(err) {
//                        console.log('Error has occured:', err);
//                    }
//                }
//                result.winrate = (result.winsLong + result.winsShort) / (result.winsLong + result.winsShort + result.losesLong + result.winsShort);
//                this.testResults.push(result);
//            }
//            return this.testResults;
//        } catch(err) {
//            console.log('Error has occured: ', err);
//            return [];
//        }
//    }
//
//    async testEachCandle(strategy: IStrategy): Promise<TestResult[]> {
//        const validationDataLength = Math.floor(MIN_LENGTH/10);
//        const minCalulationDataLength = Math.floor(MIN_LENGTH/2.45);
//        try {
//            // interesting timeframes
//            const timeframes: Timeframe[] = [Timeframe.m1];
//            const clonedStrategies: IStrategy[] = this.cloneStrategy(timeframes.length, strategy);
//            const symbols = await getMarketSymbols(this.exchange);
//            this.testResults = [];
//
//            for(let t = 0; t < timeframes.length; t++) {
//                const result: TestResult = {
//                    balance: DEFAULT_BALANCE,
//                    winsLong: 0,
//                    losesLong: 0,
//                    winsShort: 0,
//                    losesShort: 0,
//                    winrate: 0,
//                    timeframe: timeframes[t]
//                };
//
//                let loopcount = 0;
//                for(let symbol of symbols) {
//                    try {
//                        const monthData = await this.exchange.fetchOHLCV(symbol, Timeframe.Mo1);
//                        const firstTimeUTC = monthData[0][0];
//                        const dataForDiff: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframes[t]);
//                        const timeDiff = dataForDiff[dataForDiff.length - 1][0] - dataForDiff[0][0];
//
//                        for(let i = 1; (Date.now() - timeDiff * i) - firstTimeUTC  - timeDiff * RAND_OFFSET> 0; i++) {
//                            const randOffset: number = random(0, RAND_OFFSET);
//
//                            const data: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframes[t], Math.floor((Date.now() - timeDiff * i) - timeDiff * randOffset));
//                            if(data.length < MIN_LENGTH) {
//                                continue;
//                            }
//
//                            for(let i = 0; i < data.length - validationDataLength - minCalulationDataLength; i++) {
//                                const testData = data.slice(0, minCalulationDataLength+i);
//                                const validationData = data.slice(minCalulationDataLength+i, data.length);
//                                const tradeDirection: TradeDirection = await clonedStrategies[t].calculate(testData);
//                                if(tradeDirection == TradeDirection.BUY) {
//                                    const {stop, target} = await clonedStrategies[t].getStopLossTarget(testData, TradeDirection.BUY);
//                                    const balanceDiff = this.checkResultLong(validationData, stop, target, testData[testData.length-1][4]);
//                                    if(balanceDiff > 1) {
//                                        result.winsLong++;
//                                        // increment i because some strategys would trigger a few times back to back 
//                                        i += 5;
//                                        continue;
//                                    } else {
//                                        result.losesLong++;
//                                        // increment i because some strategys would trigger a few times back to back 
//                                        i += 5;
//                                        continue;
//                                    }
//                                } else if (tradeDirection == TradeDirection.SELL) {
//                                    const {stop, target} = await clonedStrategies[t].getStopLossTarget(testData, TradeDirection.SELL);
//                                    const balanceDiff = this.checkResultShort(validationData, stop, target, testData[testData.length-1][4])
//                                    if(balanceDiff > 1) {
//                                        result.winsShort++;
//                                        // increment i because some strategys would trigger a few times back to back 
//                                        i += 5;
//                                        continue;
//                                    } else {
//                                        result.losesShort++;
//                                        // increment i because some strategys would trigger a few times back to back 
//                                        i += 5;
//                                        continue;
//                                    }
//                                }
//                            }
//                        }
//                        loopcount++;
//                        console.log(loopcount, '/', symbols.length);
//                    } catch(err) {
//                        console.log('Error has occured:', err);
//                    }
//                }
//                result.winrate = (result.winsLong + result.winsShort) / (result.winsLong + result.winsShort + result.losesLong + result.winsShort);
//                this.testResults.push(result);
//            }
//            return this.testResults;
//        } catch(err) {
//            console.log('Error has occured: ', err);
//            return [];
//        }
// 
//    }
//
//    checkResultLong(data: OHLCV[], stopLoss: number, target: number, currentPrice: number): number {
//        for(let d of data) {
//            if(d[4] > target) {
//                return target / currentPrice;
//            } else if (d[4] < stopLoss) {
//                return stopLoss / currentPrice;
//            }
//        }
//        return 1;
//    }
//
//    checkResultShort(data: OHLCV[], stopLoss: number, target: number, currentPrice: number): number {
//        for(let d of data) {
//            if(d[4] < target) {
//                return (target / currentPrice) * -1 + 2;
//            } else if (d[4] > stopLoss) {
//                return (stopLoss / currentPrice) * -1 + 2;
//            }
//        }
//        return 1;
//    }
//
//    createDataChunks(chunkAmount: number, data: OHLCV[]): {testData: OHLCV[][], validationData: OHLCV[][]} {
//        const chunkSize = data.length / chunkAmount;
//        const testData: OHLCV[][] = [];
//        const validationData: OHLCV[][] = [];
//             
//        for(let i = 0; i < chunkAmount - 1; i++) {
//            testData.push(data.slice(chunkSize * i, chunkSize * (i+1)));
//            validationData.push(data.slice(chunkSize * (i+1), chunkSize * (i+2)));
//        }
//
//        return {testData, validationData};
//    }
//
//    cloneStrategy(amount: number, strategy: IStrategy): IStrategy[] {
//        const strategies: IStrategy[] = [];
//        for(let i = 0; i < amount; i++) {
//            strategies.push(cloneDeep(strategy));
//        }
//        return strategies;
//    }
//
//    async saveResults(database: Database, name: string) {
//        const testResults = await database.loadTestResult();
//        let contains = false;
//        for(let result of testResults) {
//            if(result.name == name) {
//                contains = true;
//            }
//        }
//        if(!contains) {
//            for(let oldResult of this.testResults) {
//                    await database.saveTestResult(name, oldResult.timeframe, oldResult.winsLong, oldResult.losesLong, 
//                        oldResult.winsShort, oldResult.losesShort, oldResult.winrate);
//            }
//        } else {
//            for(let result of testResults) {
//                for(let old of this.testResults) {
//                    let winrate = (result.winsLong + result.winsShort) / (result.winsLong + result.winsShort + result.losesLong + result.losesShort);
//                    if(!winrate) {
//                        winrate = 0;
//                    }
//                    if(result.name == name && old.timeframe == result.timeframe) {
//                        result.winsLong += old.winsLong;
//                        result.winsShort += old.winsShort;
//                        result.losesLong += old.losesLong;
//                        result.losesShort += old.losesShort;
//                        result.winrate = 0;
//                        await database.updateTestResult(result);
//                    }
//                }
//            }
//        }
//    }
//}