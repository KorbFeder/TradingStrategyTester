import { Exchange, OHLCV } from "ccxt";
import { TradeDirection } from "../Consts/TradeDirection";
import { Trend } from "../Consts/Trend";
import { Candlestick } from "../Consts/Candlestick";
import { IStrategy } from "../Models/Strategy-interface";
import { MarketTrend } from "../Technicals/MarketTrend";
import { PivotExtremes } from "../Technicals/PivotExtremes";
import { StopLoss } from "../Orders/StopLoss";
import { Timeframe } from "../Consts/Timeframe";
import { IDynamicExit } from "../Models/DynamicExit-interface";

export class FibRetracementStrategy implements IStrategy {
    usesDynamicExit: boolean = false;
    
    private pivot_length: number = 10;
    private max_lookback: number = 30;

    async calculate(data: OHLCV[], optional?: any): Promise<TradeDirection> {
        const marketTrend: MarketTrend = new MarketTrend();
        const trend: Trend = await marketTrend.tripleSMA(data);
        
        let indexLow = -1;
        let indexHigh = -1;

        const {highs, lows}: {highs: boolean[], lows: boolean[]} = PivotExtremes.asBoolArray(data, this.pivot_length);

        // find highs and lows with their index
        for(let i = data.length-1; i > data.length-this.max_lookback; i--) {
            if(lows[i]) {
                indexLow = i;
            }
            if(highs[i]) {
                indexHigh = i;
            }
            if(indexHigh != -1 && indexLow != -1) {
                break;
            }
        }

        // if there was no pivot highs or lows at the end
        if(indexLow == -1 || indexHigh == -1) {
            return TradeDirection.HOLD;
        }

        const low: number = data[indexLow][Candlestick.LOW];
        const high: number = data[indexHigh][Candlestick.HIGH];

        const resistanceCheck: number = data[data.length-3][Candlestick.CLOSE];
        // if the last candle before the current candle closed above resisance -> buy current price
        const conformation: number = data[data.length-2][Candlestick.CLOSE];
        
        // check if the there is a trend and structure matches that trend
        if(trend == Trend.UP) {
            // in uptrend structure needs to be bullish
            if(indexLow < indexHigh) {
                const fibLevels: number[] = this.calculateFibLevels(low, high);

                // check if price is between one of the fib levels:
                // between 0.23 and 0.38
                if(resistanceCheck < fibLevels[5] && resistanceCheck > fibLevels[4]) {
                    // check if candle closed above fib level
                    if(conformation > fibLevels[5] && conformation < fibLevels[6] && this.checkGreenCandle(data[data.length-2])) {
                        return TradeDirection.BUY;
                    }
                }
                // between 0.38 and 0.5
                if(resistanceCheck < fibLevels[4] && resistanceCheck > fibLevels[3]) {
                    // check if candle closed above fib level
                    if(conformation > fibLevels[4] && conformation < fibLevels[5] && this.checkGreenCandle(data[data.length-2])) {
                        return TradeDirection.BUY;
                    }
                }

                // between 0.5 and 0.618
                if(resistanceCheck < fibLevels[3] && resistanceCheck > fibLevels[2]) {
                    // check for green candle close
                    if(conformation > fibLevels[3] && conformation < fibLevels[4] && this.checkGreenCandle(data[data.length-2])) {
                        return TradeDirection.BUY; 
                    }
            }


            }
        } else if(trend == Trend.DOWN) {
            // in downtrend structure needs to be bearish
            if(indexHigh < indexLow) {
                const fibLevels: number[] = this.calculateFibLevels(low, high);

                // check if price is between one of the fib levels:
                // between 0.23 and 0.38
                if(resistanceCheck < fibLevels[5] && resistanceCheck > fibLevels[4]) {
                    // check if candle closed above fib level
                    if(conformation > fibLevels[4] && conformation > fibLevels[3] && this.checkRedCandle(data[data.length-2])) {
                        return TradeDirection.SELL;
                    }
                }
                // between 0.38 and 0.5
                if(resistanceCheck < fibLevels[4] && resistanceCheck > fibLevels[3]) {
                    // check if candle closed above fib level
                    if(conformation > fibLevels[3] && conformation > fibLevels[2] && this.checkRedCandle(data[data.length-2])) {
                        return TradeDirection.SELL;
                    }
                }

                // between 0.5 and 0.618
                if(resistanceCheck < fibLevels[3] && resistanceCheck > fibLevels[2]) {
                    // check for red candle close
                    if(conformation < fibLevels[2] && conformation > fibLevels[1] && this.checkRedCandle(data[data.length-2])) {
                        return TradeDirection.SELL; 
                    }
                }
            }
 
        } 


        return TradeDirection.HOLD;
    }

    async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stop: number; target: number; }> {
        return StopLoss.atr(data, data[data.length-1][Candlestick.CLOSE], direction)
    }

    private calculateFibLevels(start: number, end: number): number[] {
        const percentages = [1, 0.786, 0.618, 0.5, 0.382, 0.236, 0];
        const results: number[] = [];
        for(let percentage of percentages) {
            results.push(end - ((end-start) * percentage));
        }
        return results;
    }

    private checkGreenCandle(dataPoint: OHLCV): boolean {
        return dataPoint[Candlestick.CLOSE] > dataPoint[Candlestick.OPEN];
    }

    private checkRedCandle(dataPoint: OHLCV): boolean {
        return dataPoint[Candlestick.CLOSE] < dataPoint[Candlestick.OPEN];
    }

	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
        return undefined;
    }
}