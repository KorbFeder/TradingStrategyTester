import { Exchange, OHLCV } from "ccxt";
import { CrossUp, SMA } from "technicalindicators";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";
import { CrossInput } from "technicalindicators/declarations/Utils/CrossUp";
import { Candlestick } from "../Consts/Candlestick";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { CrossUpside } from "../helper";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";
import { SMAnt } from "../Technicals/SMAnt";


export class MaCrossStrategy implements IStrategy {
    usesDynamicExit: boolean = false;

    constructor(private fastMa: number, private slowMa: number) {}
    
    async calculate(data: OHLCV[], exchange?: Exchange, symbol?: string, timeframe?: Timeframe, since?: number, limit?: number): Promise<TradeDirection> {
        let fast: number[] = [];
        let slow: number[] = [];

        for(let i = 1; i >= 0; i--) {
            //const fastInput: MAInput = {
            //    period: this.fastMa,
            //    values: data.slice(data.length - this.fastMa - i, data.length - i).map((ohlcv: OHLCV) => ohlcv[4])
            //}
            //const slowInput: MAInput = {
            //    period: this.slowMa,
            //    values: data.slice(data.length - this.slowMa - i, data.length - i).map((ohlcv: OHLCV) => ohlcv[4])
            //}

            //fast = fast.concat(SMA.calculate(fastInput));
            //slow = slow.concat(SMA.calculate(slowInput));

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

    async getStopLossTarget(data: OHLCV[], entryPrice: number, direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
        return StopLoss.defaultAtr(data, entryPrice, direction);
    }

	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
        return undefined;
    }
}