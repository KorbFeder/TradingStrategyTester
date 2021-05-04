import * as ccxt from "ccxt";
import { sleep, getMarketPrice, getMarketSymbols, filterAndOrder } from "./helper";
import { RsiStrategy } from "./Strategies/RsiStrategy";
import { Timeframe } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { ITradingAccount, OrderStatus } from "./Models/TradingAccount-interface";
import { IStrategy } from "./Models/Strategy-interface";

const MAX_POSITIONS = 15;

export class Trading {
    private positions: number = MAX_POSITIONS;
    private stopTargetOrders: {orderId: string, symbol: string, stop: number, target: number}[] = [];
    private candidates: string[] = [];
    
    constructor(
        private exchange: ccxt.Exchange,
        private tradeAccount: ITradingAccount,
        private strategies: IStrategy[],
        private timeframe: Timeframe 
    ) {
    }

    public async trade() {
        while(true) {
            // filter for the best potential cryptos to buy
            this.candidates = await filterAndOrder(new RsiStrategy(this.exchange, this.timeframe), this.exchange);

            // use the strategies on the best candidates
            for(let symbol of this.candidates) {
                await sleep(this.exchange.rateLimit);
                const crytpoToBuy =  await this.useStrategies(symbol);
                if (crytpoToBuy.tradeStatus == TradeDirection.BUY) {
                    const orderId = await this.buy(crytpoToBuy.symbol);
                    if(orderId) {
                        this.stopTargetOrders.push({orderId, symbol, stop: crytpoToBuy.stop, target: crytpoToBuy.target});
                        this.positions--;
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
            tradeStatus = TradeDirection.SELL;
        } else if (confidence <= 0.40){
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
        for(let stopTargetOrder of this.stopTargetOrders) {
            if(await this.tradeAccount.getOrderStatus(stopTargetOrder.orderId, stopTargetOrder.symbol) == OrderStatus.CLOSE) {
                const amount = (await this.tradeAccount.getBalance(stopTargetOrder.symbol)).free;
                const {stopId, targetId} = await this.tradeAccount.sellStopLossTarget(stopTargetOrder.symbol, amount, stopTargetOrder.stop, stopTargetOrder.target);
                if(!stopId && !targetId) {
                    return;
                }
                // remove order
                this.stopTargetOrders = this.stopTargetOrders.filter((order) => order.orderId != stopTargetOrder.orderId);
            }
        }
    }



    async partitionMoney(): Promise<number> {
        this.positions = MAX_POSITIONS - (await this.tradeAccount.getAllOpenOrders()).length;

        const balance: {free: number, used: number} = await this.tradeAccount.getBalance('USDT');
        const partitionedMoney: number = balance.free / this.positions;
        this.positions--;
        
        if(balance.free > 0 && balance.free < partitionedMoney) {
            return balance.free;
        }
        
        return partitionedMoney;
    }
}