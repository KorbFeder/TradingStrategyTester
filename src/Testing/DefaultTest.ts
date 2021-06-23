import { Exchange, OHLCV } from "ccxt";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IStrategy } from "../Models/Strategy-interface";

interface TestData {
    symbol: string;
    timeStamp: number;
    timeframe: Timeframe;
    expection: TradeDirection;
}

export class DefaultTest {
    constructor(private exchange: Exchange) {

    }

    public async start(strategy: IStrategy, testData: {symbol: string, timeStamp: number, timeframe: Timeframe, expection: TradeDirection}[]): Promise<{success: boolean, direction: TradeDirection}[]> {
        const results: {success: boolean , direction: TradeDirection}[] = [];

        for(let data of testData) {
            data.timeStamp -= await this.calculateOffset(data.symbol, data.timeframe);
            const ohlcvs: OHLCV[] = await this.exchange.fetchOHLCV(data.symbol, data.timeframe, data.timeStamp);
            const tradeDirection: TradeDirection = await strategy.calculate(ohlcvs);
            if(tradeDirection == data.expection) {
                results.push({success: true, direction: data.expection});
            } else {
                results.push({success: false, direction: data.expection});
            }
        }
        return results;
    }

    async calculateOffset(symbol: string, timeframe: Timeframe): Promise<number> {
        // - 7189200000
        const data: OHLCV[] = await this.exchange.fetchOHLCV(symbol, timeframe);
        const timeDiff = data[1][0] - data[0][0];
        
        return timeDiff * 500 - 1;
    }
}