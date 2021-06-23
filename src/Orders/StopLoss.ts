import { OHLCV } from "ccxt";
import { ATR } from "technicalindicators";
import { ATRInput } from "technicalindicators/declarations/directionalmovement/ATR";
import { TradeDirection } from "../Consts/TradeDirection";

export class StopLoss {
    private static riskRewardRatio = 2;
    private static atrMultiplier = 1.5;

    static percentage(buyPrice: number, direction: TradeDirection): {stop: number, target: number} {
        const price = buyPrice;
        if(TradeDirection.SELL == direction) {
            return {stop: price + price * 0.02, target: price - price * 0.04};
        } else if(TradeDirection.BUY == direction) {
            return {stop: price - price * 0.02, target: price + price * 0.04};
        } else {
            throw "trade direction is not specifed";
        }
    }

    static atr(data: OHLCV[], buyPrice: number, direction: TradeDirection): {stop: number, target: number} {
        const atrInput: ATRInput = {
            period: 14,
            low: data.map((d) => d[3]),
            high: data.map((d) => d[2]),
            close: data.map((d) => d[4]),
        };
        const atrResult = ATR.calculate(atrInput);
        const atr = atrResult[atrResult.length-1];
        if(direction == TradeDirection.BUY) {
            return {stop: buyPrice - (this.atrMultiplier * atr), target: buyPrice + (this.atrMultiplier * this.riskRewardRatio * atr)};
        } else if(direction == TradeDirection.SELL) {
            return {stop: buyPrice + (this.atrMultiplier * atr), target: buyPrice - (this.atrMultiplier * this.riskRewardRatio * atr)};
        } else {
            throw "trade direction is not specified";
        }
    }
}