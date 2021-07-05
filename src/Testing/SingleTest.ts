import { Exchange, OHLCV } from "ccxt";
import { Timeframe, timeToNumber } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IStrategy } from "../Models/Strategy-interface";

const LIMIT = 500;

export class SingleTest {
    constructor() {
    }

    public static async start(exchange: Exchange, symbol: string, timeframe: Timeframe, date: Date, strategy: IStrategy, expection: TradeDirection): Promise<boolean> {
        const timeStamp = this.calculateTimeStamp(date, timeframe, LIMIT - 1);

        //data.timeStamp -= await this.calculateOffset(data.symbol, data.timeframe);
        const ohlcvs: OHLCV[] = await exchange.fetchOHLCV(symbol, timeframe, timeStamp, LIMIT);
        const tradeDirection: TradeDirection = await strategy.calculate(ohlcvs);
        if(tradeDirection == expection) {
            return true;
        } else {
            return false;
        }
    }

    static calculateTimeStamp(date: Date, timeframe: Timeframe, limit: number): number {
        const diff = timeToNumber(timeframe) * limit;
        return date.getTime() - diff;
    }

    static async calculateOffset(exchange: Exchange, symbol: string, timeframe: Timeframe): Promise<number> {
        // - 7189200000
        const data: OHLCV[] = await exchange.fetchOHLCV(symbol, timeframe);
        const timeDiff = data[1][0] - data[0][0];
        
        return timeDiff * 500 - 1;
    }
}