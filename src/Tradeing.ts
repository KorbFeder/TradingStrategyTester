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
        const tradeDirection: TradeDirection = await strategy.calculate(data);
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

class Trading1 {
    private boughtCrypto: {symbol: string, stop: number, target: number}[] = [];

    constructor(
        private exchange: ccxt.Exchange,
        private tradeAccount: ITradingAccount,
        private strategy: IStrategy,
        private timeframe: Timeframe, 
    ) {
    }

    public async trade() {
        this.boughtCrypto = await this.tradeAccount.getOldBuyOrders();

        while(true) {
            try{
                console.log('new loop start');
                // filter for the best potential cryptos to buy
                const candidates = await getMarketSymbols(this.exchange);
                
                // use the strategies on the best candidates
                for(let symbol of candidates) {
                    const crytpoToBuy =  await this.useStrategies(symbol);
                    if (crytpoToBuy.tradeStatus == TradeDirection.BUY) {
                        console.log('wanting to buy: ', symbol);
                        if(await this.buy(crytpoToBuy.symbol)) {
                            // save the buy that just happend
                            this.boughtCrypto.push({symbol, stop: crytpoToBuy.stop, target: crytpoToBuy.target});
                        }
                    }  
                }

                // set stopTargets for all the filled buy orders
                await this.stopTarget();
            } catch(err) {
                console.log(err);
            }
        }
    }

    private async useStrategies(symbol: string): Promise<{symbol: string, tradeStatus: TradeDirection, stop: number, target: number}> {
        const data = await this.exchange.fetchOHLCV(symbol, this.timeframe);
        const tradeStatus = await this.strategy.calculate(data);
        if(tradeStatus == TradeDirection.BUY) {
            console.log('bullish on ', symbol);
        } else if(tradeStatus == TradeDirection.SELL) {
            console.log('bearish on ', symbol);
        }
        const stopLoss = await this.strategy.getStopLossTarget(data, TradeDirection.BUY);

        return {symbol,  tradeStatus, stop: stopLoss.stop, target: stopLoss.target};
    }

    // returns true if trade was successful false, if it didn't buy
    private async buy(symbol: string): Promise<boolean> {
        // check if buy order is already filled for that coin
        if(this.boughtCrypto.filter((crypto) => symbol == crypto.symbol).length > 0) {
            return false;
        }

        // maybe catch error of buy here
        const part = await this.partitionMoney();
        if(part != 0) {
            const pricePerCoin = await getMarketPrice(this.exchange, symbol);
            if(pricePerCoin) {
                console.log('trying to buy...', symbol);
                const amount = part / pricePerCoin.ask;
                return await this.tradeAccount.buy(symbol, amount, pricePerCoin.ask);
            }
        }
        return false;
    }

    private async stopTarget() {
        for(let buy of this.boughtCrypto) {
            if(await this.tradeAccount.sellStopLossTarget(buy.symbol, buy.stop, buy.target)) {
                // if sell succeeds remove the sold crypto
                this.boughtCrypto = this.boughtCrypto.filter((crypto) => buy.symbol != crypto.symbol);
            }
        }
    }

    async partitionMoney(): Promise<number> {
        const MAX_POSITIONS: number = process.env.MAX_POSITIONS ? parseInt(process.env.MAX_POSITIONS) : 5;
        const positions = MAX_POSITIONS - (await this.tradeAccount.getOpenOrdersCount());
        if(positions <= 0) {
            return 0;
        }

        const quoteCurrency = process.env.QUOTE_CURRENCY ? process.env.QUOTE_CURRENCY : 'USDT';
        const balance: {free: number, used: number} = await this.tradeAccount.getBalance(quoteCurrency);
        const partitionedMoney: number = balance.free / positions;
        // todo -> maybe differen for other platforms with different fees types
        const fee = 0.001 
        
        if(balance.free > 0 && balance.free < partitionedMoney) {
            return balance.free;
        }
        
        return partitionedMoney - partitionedMoney * fee;
    }
}