import * as ccxt from "ccxt";
import { getMarketPrice, getMarketSymbols } from "./helper";
import { Timeframe } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { ITradingAccount } from "./Models/TradingAccount-interface";
import { IStrategy } from "./Models/Strategy-interface";
import { Orders } from "./Orders/Orders";
import { Candlestick } from "./Consts/Candlestick";
import { MarketTrend } from "./Technicals/MarketTrend";
import { Trend } from "./Consts/Trend";
import { IDynamicExit } from "./Models/DynamicExit-interface";

export class Trading {
    private dynamicExits: IDynamicExit[] = [];

    constructor(
        private exchange: ccxt.Exchange,
        private trendingStrategy: IStrategy,
        private rangingStrategy: IStrategy,
        private timeframe: Timeframe
    ){}

    async trade() {
        while(true) {
            const symbols = await getMarketSymbols(this.exchange);

            for(let symbol of symbols) {
                try{
                    const data: ccxt.OHLCV[] = await this.exchange.fetchOHLCV(symbol, this.timeframe);
                    const trend: Trend = MarketTrend.renko(data);

                    if(trend == Trend.DOWN || trend == Trend.UP) {
                        // trending environment
                        await this.useStrategy(data, symbol, this.trendingStrategy);
                    } else if(trend == Trend.SIDE) {
                        // ranging environment
                        await this.useStrategy(data, symbol, this.rangingStrategy);
                    }
                    await this.checkDynamicExit();
                } catch(err) {
                    console.log(err);
                }
            }
            console.log('round finished');
        }
    }

    async waitForOrderCompletion(symbol: string, order: Orders) {
        while(true) {
            const positionStatus = await order.checkPositionStatus(symbol);
            if(positionStatus.positionActive) {
                console.log('waited for order to fill, position now active');
                break;
            }
        }
    }

    async checkDynamicExit() {
        const order = new Orders(this.exchange);
        for(let exit of this.dynamicExits) {
            if(await exit.exitTrade()) {
                console.log('exiting:', exit.symbol);
                await order.closePosition(exit.symbol);
                this.dynamicExits = this.dynamicExits.filter((ex) => !(ex.symbol == exit.symbol));
            }
        } 

    }

    async useStrategy(data: ccxt.OHLCV[], symbol: string, strategy: IStrategy) {
        const order = new Orders(this.exchange);
        const tradeDirection: TradeDirection = await strategy.calculate(data, this.exchange, symbol, this.timeframe);
        if(!(tradeDirection == TradeDirection.HOLD)) {
            if(!strategy.usesDynamicExit) {
                console.log('Takeing position', symbol, '. Direction:', tradeDirection);

                const orders = await order.defaultPosition(symbol, data[data.length-1][Candlestick.CLOSE], this.timeframe, tradeDirection);
                if(orders) {
                    await this.waitForOrderCompletion(symbol, order);
                }
                await order.removeUselessOrders();
            
            } else {
                const marketOrder = await order.defaultMarketOrder(symbol, data[data.length-1][Candlestick.CLOSE], tradeDirection, this.timeframe);

                // emergency stopLoss if there is one
                const {stop} = await strategy.getStopLossTarget(data, tradeDirection);
                if(stop != -1 && marketOrder) {
                    await order.stopLoss(symbol, marketOrder[0].amount, stop, tradeDirection);
                }

                if(marketOrder) {
                    await this.waitForOrderCompletion(symbol, order);
                    const dynamicExit = await strategy.dynamicExit(this.exchange, symbol, this.timeframe, tradeDirection);
                    if(dynamicExit) {
                        this.dynamicExits.push(dynamicExit);
                    } else {
                        throw 'dynamic exit was specified but dynamic exit class was provided';
                    }
                }
                await order.removeUselessOrders();
            }
        }
    }
}
