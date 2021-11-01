import { Exchange, OHLCV } from "ccxt";
import { MarketStructure } from "../Consts/MarketStructure";
import { timeToNumber } from "../Consts/Timeframe";
import { MarketStructFinder } from "../Models/MarketStructFinder-interface";
import { marketStructureData, MarketStructureTimestamp } from "./MarketStructureData";

const MIN_LENGTH = 500;

export class MarketStructureBackTest{

    constructor(private exchange: Exchange) {
    }

    public async testAll(finder: MarketStructFinder): Promise<{wins: number; loses: number}> {
        const testData = marketStructureData;
        const result: {wins: number; loses: number} = {wins: 0, loses: 0};
        for(let data of testData) {
            if(await this.simpleTest(data, finder)) {
                result.wins++;
            } else {
                result.loses++;
            }
        }
        return result;
    }

	public async simpleTest(backTest: MarketStructureTimestamp, finder: MarketStructFinder): Promise<boolean> {
        const timeDiff: number = timeToNumber(backTest.timeframe);
        const offset: number = timeDiff * (MIN_LENGTH - 1);
        const currentTime: number = backTest.endTimestamp.getTime() - offset;
 
        try{
            const data: OHLCV[] = await this.exchange.fetchOHLCV(backTest.symbol, backTest.timeframe, currentTime, MIN_LENGTH);
            const marketStructure: MarketStructure = await finder.calculate(data);
            if(marketStructure == backTest.marketStructure) {
                return true
            }
        } catch(err) {
            console.log(err);
        }
        return false;
    }
}