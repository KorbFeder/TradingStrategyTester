import { Exchange, OHLCV } from "ccxt";
import { BollingerBands } from "technicalindicators";
import { BollingerBandsInput } from "technicalindicators/declarations/volatility/BollingerBands";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";

export class BollingerBandsStrategy implements IStrategy {
    usesDynamicExit: boolean = false;
    
    private period = 20;
    private stdDev = 2;

    async calculate(data: OHLCV[], optional?: any): Promise<TradeDirection> {
        const currentPrice = data[data.length-1][4];
        const input: BollingerBandsInput = {
            period: this.period,
            values: data.map((d) => d[4]),
            stdDev: this.stdDev
        }
        const bbResult = BollingerBands.calculate(input);
        if(bbResult[bbResult.length-1].lower > currentPrice) {
            return TradeDirection.BUY;
        } else if(bbResult[bbResult.length-1].upper < currentPrice) {
            return TradeDirection.SELL;
        } 

        return TradeDirection.HOLD;
    }

    async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stop: number; target: number; }> {
        return StopLoss.atr(data, data[data.length-1][4], direction);
    }
    
	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
        return undefined;
    }
}