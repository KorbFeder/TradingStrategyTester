import { Exchange, OHLCV, Trade } from "ccxt";
import { MACD } from "technicalindicators";
import { MACDInput, MACDOutput } from "technicalindicators/declarations/moving_averages/MACD";
import { Timeframe } from "../Consts/Timeframe";
import { TradeDirection } from "../Consts/TradeDirection";
import { IDynamicExit } from "../Models/DynamicExit-interface";
import { LimitOrder } from "../Models/FuturePosition-interface";
import { IStrategy } from "../Models/Strategy-interface";
import { StopLoss } from "../Orders/StopLoss";

export class MacdStrategy implements IStrategy {
    private macdFastLength = 12;
    private macdSlowLength = 26;
    private macdSignalSmoothing = 9;
    private hisogramPips = 4;
    usesDynamicExit: boolean = false;

    constructor(
    ) {}


    macd(data: OHLCV[]): MACDOutput[] {
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

        return macdRestults.slice(macdRestults.length - this.hisogramPips, macdRestults.length);
    }

    async calculate(data: OHLCV[]): Promise<TradeDirection> {
        const macdResult = this.macd(data);

        enum macdState {
            INIT, NEG_HISTO, POS_HISTO
        };

        let state: macdState = macdState.INIT;
        for(let macd of macdResult) {
            if (macd.histogram && macd.MACD) {
                switch(state) {
                    case macdState.INIT: 
                        if(macd.histogram < 0) {
                            state = macdState.NEG_HISTO;
                        } else if(macd.histogram > 0) {
                            state = macdState.POS_HISTO;
                        }
                        break;

                    case macdState.NEG_HISTO:
                        if(macd.histogram > 0 && macd.MACD < 0) {
                            return TradeDirection.BUY;
                        }
                        break;

                    case macdState.POS_HISTO:
                        if(macd.histogram < 0 && macd.MACD > 0) {
                            return TradeDirection.SELL;
                        }
                        break;
                }
            }
        }
        return TradeDirection.HOLD;
    }

	async getStopLossTarget(data: OHLCV[], direction: TradeDirection): Promise<{ stops: LimitOrder[]; targets: LimitOrder[]; }> {
        return StopLoss.atr(data, data[data.length-1][4], direction);
    }

	async dynamicExit(exchange: Exchange, symbol: string, timeframe: Timeframe, tradeDirection: TradeDirection): Promise<IDynamicExit | undefined> {
        return undefined;
    }
}