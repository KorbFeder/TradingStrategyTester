import * as ccxt from "ccxt";
import { sleep, getMarketPrice, getMarketSymbols, filterAndOrder, getBaseCurrency, getFees, orderMarkets } from "./helper";
import { RsiStrategy } from "./Strategies/RsiStrategy";
import { Timeframe } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { ITradingAccount, OrderStatus } from "./Models/TradingAccount-interface";
import { IStrategy } from "./Models/Strategy-interface";


export class Trading {
    private lastBuyOrders: {orderId: string, symbol: string, stop: number, target: number}[] = [];
    
    constructor(
        private exchange: ccxt.Exchange,
        private tradeAccount: ITradingAccount,
        private strategies: IStrategy[],
        private timeframe: Timeframe 
    ) {
    }

    public async trade() {
        const marketSymbols: string[] = await getMarketSymbols(this.exchange);

        while(true) {
            // filter for the best potential cryptos to buy
            const candidates = await orderMarkets(this.exchange, marketSymbols, new RsiStrategy(this.exchange, this.timeframe));

            // use the strategies on the best candidates
            for(let symbol of candidates) {
                const crytpoToBuy =  await this.useStrategies(symbol);
                if (crytpoToBuy.tradeStatus == TradeDirection.BUY) {
                    const orderId = await this.buy(crytpoToBuy.symbol);
                    if(orderId) {
                        this.lastBuyOrders.push({orderId, symbol, stop: crytpoToBuy.stop, target: crytpoToBuy.target});
                    }
                }  
            }

            // set stopTargets for all the filled buy orders
            await this.stopTarget();
        }
    }

    private async useStrategies(symbol: string): Promise<{symbol: string, confidence: number, tradeStatus: TradeDirection, stop: number, target: number}> {
        let confidence = 0;
        let stop = 0;
        let target = 0;
        for(let strategy of this.strategies) {
            await strategy.calculate(symbol);
            confidence += strategy.getConfidenceValue() / this.strategies.length;
            const stopLoss = await strategy.getStopLossTarget(symbol);
            stop += stopLoss.stop / this.strategies.length;
            target += stopLoss.target / this.strategies.length;
        }
        let tradeStatus = TradeDirection.HOLD;

        if(confidence >= 0.7) {
            console.log('indicator for stategy says SELL');
            tradeStatus = TradeDirection.SELL;
        } else if (confidence <= 0.30){
            console.log('indicator for stategy says BUY');
            tradeStatus = TradeDirection.BUY
        }

        return {symbol, confidence, tradeStatus, stop, target};
    }

    private async buy(symbol: string): Promise<string | undefined> {
        const ordersOnSamePair = await this.tradeAccount.getOpenOrders(symbol);
        if(ordersOnSamePair.length != 0) {
            return undefined;
        }

        const part = await this.partitionMoney();
        if(part != 0) {
            const pricePerCoin = await getMarketPrice(this.exchange, symbol);
            if(pricePerCoin) {
                console.log('buying...', symbol);
                const amount = part / pricePerCoin.ask;
                return await this.tradeAccount.buy(symbol, amount, pricePerCoin.ask);
            }
        }
    }

    private async stopTarget() {
        for(let lastBuyOrder of this.lastBuyOrders) {
            if(await this.tradeAccount.getOrderStatus(lastBuyOrder.orderId, lastBuyOrder.symbol) == OrderStatus.CLOSE) {
                const amount = (await this.tradeAccount.getBalance(getBaseCurrency(lastBuyOrder.symbol))).free;
                const ids = await this.tradeAccount.sellStopLossTarget(lastBuyOrder.symbol, amount, lastBuyOrder.stop, lastBuyOrder.target);
                if(!ids) {
                    continue;
                }
                // remove order
                this.lastBuyOrders = this.lastBuyOrders.filter((order) => order.orderId != lastBuyOrder.orderId);
            }
        }
    }



    async partitionMoney(): Promise<number> {
        const MAX_POSITIONS: number = process.env.MAX_POSITIONS ? parseInt(process.env.MAX_POSITIONS) : 5;
        const positions = MAX_POSITIONS - (await this.tradeAccount.getAllOpenOrders()).length;
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