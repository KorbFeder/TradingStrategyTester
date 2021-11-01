import { Exchange, OHLCV } from "ccxt";
import { CrossUp, SMA } from "technicalindicators";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { CrossInput } from "technicalindicators/declarations/Utils/CrossUp";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { CrossUpside } from "../helper";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";


export class MaCrossStrategy implements IStrategy {
    usesDynamicExit: boolean = false;
    
    async calculate(data: OHLCV[], optional?: any): Promise<TradeDirection> {
        let sma50: number[] = [];
        let sma200: number[] = [];
        for(let i = 10; i >= 0; i--) {
            const sma50Input: MAInput = {
                period: 50,
                values: data.slice(data.length - 50 - i, data.length - i).map((ohlcv: OHLCV) => ohlcv[4])
            }
            const sma200Input: MAInput = {
                period: 200,
                values: data.slice(data.length - 200 - i, data.length - i).map((ohlcv: OHLCV) => ohlcv[4])
            }

            sma50 = sma50.concat(SMA.calculate(sma50Input));
            sma200 = sma200.concat(SMA.calculate(sma200Input));
        }
        
        
        if(CrossUpside(sma50, sma200)) {
            // gold cross
            return TradeDirection.BUY;
        }

        if(CrossUpside(sma200, sma50)) {
            // death cross
            return TradeDirection.SELL;
        }        
        return TradeDirection.HOLD;
    }

    async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
        return StopLoss.atr(data, data[data.length-1][4], direction)
    }

	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
        return undefined;
    }
}