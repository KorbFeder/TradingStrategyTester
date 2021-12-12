import { Exchange, OHLCV } from "ccxt";
import { CrossUp, SMA } from "technicalindicators";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { CrossInput } from "technicalindicators/declarations/Utils/CrossUp";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { CrossUpside } from "../helper";
import { IDataProvider } from "../Models/DataProvider-interface";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { SMAnt } from "../Technicals/SMAnt";
import { OptimizationParameters } from "../Testing/Optimizing";


export class MaCrossStrategy implements IStrategy {
    public barsNeededForIndicator: number = 20;
    private defaultFastMa: number;
    private defaultSlowMa: number;

    constructor(
        public symbol: string,
        public timeframe: Timeframe,
        private fastMa: number, 
        private slowMa: number
    ) {
        this.defaultFastMa = fastMa;
        this.defaultSlowMa = slowMa;
    }
    
    async calculate(dataProvider: IDataProvider): Promise<TradeDirection> {
        const data: OHLCV[] = await dataProvider.getOhlcv(this.symbol, this.timeframe);
        let fast: number[] = [];
        let slow: number[] = [];

        for(let i = 1; i >= 0; i--) {
            fast = fast.concat(SMAnt.calculate(data.slice(data.length - this.fastMa - i, data.length - i).map((ohlcv: OHLCV) => ohlcv[4]), this.fastMa));
            slow = slow.concat(SMAnt.calculate(data.slice(data.length - this.slowMa - i, data.length - i).map((ohlcv: OHLCV) => ohlcv[4]), this.slowMa));        
        }

        if(CrossUpside(fast, slow)) {
            // gold cross
            return TradeDirection.BUY;
        }

        if(CrossUpside(slow, fast)) {
            // death cross
            return TradeDirection.SELL;
        }        
        return TradeDirection.HOLD;
    }

    async getStopLoss(dataProvider: IDataProvider, entryPrice: number, direction: TradeDirection): Promise<LimitOrder[]> {
        const data: OHLCV[] = await dataProvider.getOhlcv(this.symbol, this.timeframe);
        return StopLoss.defaultAtr(data, entryPrice, direction).stops;
    }

    async getTarget(dataProvider: IDataProvider, entryPrice: number, direction: TradeDirection): Promise<LimitOrder[]> {
        const data: OHLCV[] = await dataProvider.getOhlcv(this.symbol, this.timeframe);
        return StopLoss.defaultAtr(data, entryPrice, direction).targets;
    }

    async checkExit(dataProvider: IDataProvider, tradeDirection: TradeDirection): Promise<boolean> {
        return false
    }

    getParams(): OptimizationParameters[] {
        return [
            //fastMa
            {startValue: 10, endValue: 30, stepValue: 5},
            // slowMa
            {startValue: 20, endValue: 100, stepValue: 10},
        ]
    }

    setParams(params: number[]): void {
        if(params.length != 2) {
            throw "too much/little paramers provided";
        }
        this.fastMa = params[0]; 
        this.slowMa = params[1]; 
    }

    getDefaultParams(): number[] {
        return [this.defaultFastMa, this.defaultSlowMa];
    }
}