import { Exchange, OHLCV } from "ccxt";
import { SMA, MACD,  RSI, EMA } from "technicalindicators";
import { MACDInput } from "technicalindicators/declarations/moving_averages/MACD";
import { RSIInput } from "technicalindicators/declarations/oscillators/RSI";
import { Trend } from "../Consts/Trend";
import { Candlestick } from "../Consts/Candlestick";
import { PivotExtremes } from "./PivotExtremes";
import { Renko } from "./Renko";

const RSI_MIDDLE = 50;

export class MarketTrend {
    private sma100period = 100;
    private sma50period = 50;
    private sma200period = 200;

    private macdFastLength = 12;
    private macdSlowLength = 26;
    private macdSignalSmoothing = 9;

    private rsiPeriod = 14;

    private static emaPeriod = 200;

    private static pivotLength = 5;

    constructor() {}

    private async getIndicatorTrends(data:  OHLCV[]): Promise<Trend[]> {
        const trends: Trend[] = [];

        trends.push(this.tripleSMA(data));
        trends.push(this.macd(data));
        //trends.push(this.ema(data));
        trends.push(this.rsi(data));

        return trends;
    }

    async useAllIndicators(data: OHLCV[]): Promise<Trend> {
        const trends = await this.getIndicatorTrends(data);
        let uptrend = 0;
        let downtrend = 0;
        for(let trend of trends) {
            if(trend == Trend.UP) {
                uptrend++;
            } else if (trend == Trend.DOWN) {
                downtrend++;
            }
        }
        if(uptrend / (uptrend + downtrend) >= 0.66) {
            return Trend.UP;
        } else if (downtrend / (uptrend + downtrend) >= 0.66) {
            return Trend.DOWN;
        } else {
            return Trend.SIDE;
        }
    }

    public static ema(data: OHLCV[]): Trend {
        const values = data.map((ohlcv) => ohlcv[4]);
        const result = EMA.calculate({period: this.emaPeriod, values});
        
        if(data[data.length-1][4] > result[result.length-1]) {
            // above ema
            return Trend.UP;
        } else if(data[data.length-1][4] < result[result.length-1]) {
            // below ema
            return Trend.DOWN
        }
        return Trend.SIDE;
    }

    public macd(data: OHLCV[]): Trend {
        let macdLength = data.length - 5 * this.macdSlowLength;
        if(macdLength < 0) {
            macdLength = 0;
        }
        const macdInput: MACDInput = {
            values: data.slice(macdLength, data.length).map((ohlcv: OHLCV) => ohlcv[4]),
            fastPeriod: this.macdFastLength,
            slowPeriod: this.macdSlowLength,
            signalPeriod: this.macdSignalSmoothing,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        }

        const macdRestults = MACD.calculate(macdInput);
        const _macd = macdRestults[macdRestults.length - 1].MACD;
        const macd = _macd ? _macd : 0;

        if(macd > 0) {
            return Trend.UP;
        } else if(macd < 0) {
            return Trend.DOWN;
        } else {
            return Trend.SIDE;
        }
    }

    public rsi(data: OHLCV[]): Trend {
        const rsiInput: RSIInput =  {
            values: data.slice(data.length - this.rsiPeriod - 1, data.length).map((ohlcv: OHLCV) => ohlcv[4]),
            period: this.rsiPeriod
        };

        const rsis = RSI.calculate(rsiInput);
        const rsiValue = rsis[rsis.length-1];

        if(rsiValue > RSI_MIDDLE) {
            return Trend.UP;
        } else if(rsiValue < RSI_MIDDLE) {
            return Trend.DOWN;
        } else {
            return Trend.SIDE;
        }
    }

    public tripleSMA(data: OHLCV[]): Trend {
        const sma50 = SMA.calculate({period: this.sma50period, values: data.slice(data.length - this.sma50period, data.length).map((ohlcv: OHLCV) => ohlcv[4])});
        const sma100 = SMA.calculate({period: this.sma100period, values: data.slice(data.length - this.sma100period, data.length).map((ohlcv: OHLCV) => ohlcv[4])});
        const sma200 = SMA.calculate({period: this.sma200period, values: data.slice(data.length - this.sma200period, data.length).map((ohlcv: OHLCV) => ohlcv[4])});
        if(sma50[sma50.length - 1] > sma100[sma100.length - 1] && sma100[sma100.length - 1] > sma200[sma200.length -1]) {
            return Trend.UP;
        } else if(sma50[sma50.length - 1] < sma100[sma100.length - 1] && sma100[sma100.length - 1] < sma200[sma200.length -1]) {
            return Trend.DOWN;
        } else {
            return Trend.SIDE;
        }
    }

    public static renko(data: OHLCV[]): Trend {
		const renkoBricks = Renko.traditional(data, data[data.length-1][Candlestick.CLOSE] * 0.001);
        
        const {highs} = PivotExtremes.oscAsBoolArray(renkoBricks.map(brick => brick.high), this.pivotLength);
        const {lows} = PivotExtremes.oscAsBoolArray(renkoBricks.map(brick => brick.low), this.pivotLength);

        enum highLowStates  {
            INIT, HIGH, HIGH2, LOW, LOW2, DOWNTREND, UPTREND
        }

        let state: highLowStates = highLowStates.INIT;
        let lastHigh = -1;
        let lastLow = -1;

        // to find a trend there need to be at least 2 highs and 2 lows forming a trend
        for(let i = renkoBricks.length - 1; i >= 0; i--) {
            switch(state) {
                case highLowStates.INIT: 
                    if(highs[i]) {
                        lastHigh = renkoBricks[i].high;
                        state = highLowStates.HIGH;
                    } else if(lows[i]) {
                        lastLow = renkoBricks[i].low;
                        state = highLowStates.LOW;
                    }
                    break;
                case highLowStates.HIGH: 
                    if(lows[i]) {
                        lastLow = renkoBricks[i].low;
                        state = highLowStates.LOW2;
                    } else if(highs[i]) {
                        return Trend.SIDE;
                    }

                    break;
                case highLowStates.LOW:
                    if(highs[i]) {
                        lastHigh = renkoBricks[i].high;
                        state = highLowStates.HIGH2;
                    } else if(lows[i]) {
                        return Trend.SIDE;
                    }
                    break;
                case highLowStates.HIGH2:
                    if(lows[i]) {
                        if(renkoBricks[i].low > lastLow) {
                            state = highLowStates.DOWNTREND;
                            lastLow = renkoBricks[i].low;
                        } else if(renkoBricks[i].low < lastLow) {
                            state = highLowStates.UPTREND
                            lastLow = renkoBricks[i].low;
                        }
                    } else if(highs[i]) {
                        return Trend.SIDE;
                    }
                    break;
                case highLowStates.LOW2: 
                    if(highs[i]) {
                       if(renkoBricks[i].high > lastHigh) {
                            state = highLowStates.DOWNTREND;
                            lastHigh = renkoBricks[i].high;
                        } else if(renkoBricks[i].high < lastHigh) {
                            state = highLowStates.UPTREND
                            lastHigh = renkoBricks[i].high;
                        }
                    } else if(lows[i]) {
                        return Trend.SIDE;
                    }
                    break;
                case highLowStates.DOWNTREND: 
                    if(highs[i]) {
                        if(renkoBricks[i].high > lastHigh) {
                            return Trend.DOWN;
                        } else {
                            return Trend.SIDE;
                        }
                    } else if(lows[i]) {
                        if(renkoBricks[i].low > lastLow) {
                            return Trend.DOWN;
                        } else {
                            return Trend.SIDE;
                        }
                    }
                    break;
                case highLowStates.UPTREND: 
                    if(highs[i]) {
                        if(renkoBricks[i].high < lastHigh) {
                            return Trend.UP;
                        } else {
                            return Trend.SIDE;
                        }
                    } else if(lows[i]) {
                        if(renkoBricks[i].low < lastLow) {
                            return Trend.UP;
                        } else {
                            return Trend.SIDE;
                        }
                    }
                    break;
            }
        }
        return Trend.SIDE;
    }
}