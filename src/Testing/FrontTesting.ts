//import { Exchange, OHLCV } from "ccxt";
//import { Candlestick } from "../Consts/Candlestick";
//import { Timeframe } from "../Consts/Timeframe";
//import { TradeDirection } from "../Consts/TradeDirection";
//import { Trend } from "../Consts/Trend";
//import { Database } from "../Database";
//import { getBaseCurrency, getMarketSymbols, getQuoteCurrency, sleep } from "../helper";
//import { ICryptoCurrency } from "../Models/CryptoCurrency-model";
//import { IDynamicExit } from "../Models/DynamicExit-interface";
//import { LimitOrder } from "../Models/FuturePosition-interface";
//import { IOrder } from "../Models/Order-model";
//import { IStrategy } from "../Models/Strategy-interface";
//import { PositionSize } from "../Orders/PositionSize";
//import { MarketTrend } from "../Technicals/MarketTrend";
//
//const FEES = 0.001;
//
//export class FrontTesting {
//    private dynamicExits: IDynamicExit[] = [];
//	private normalPositions: string[] = [];
//	private db: Database = new Database();
//	private isInit = false; 
//	private wins: number = 0;
//	private loses: number = 0;
//
//	constructor(
//		private exchange: Exchange,
//		private timeframe: Timeframe,
//		private trendingStrategy: IStrategy,
//		private rangingStrategy: IStrategy,
//		private instance: number = 0,
//	) {
//
//	}
//
//	private async init() {
//		this.isInit = true;
//		await this.db.connect(this.instance);
//	}
//
//	async start() {
//		console.log('started!');
//		if(!this.isInit) {
//			this.init();
//		}
//		const orders = await this.db.loadOrder();
//		for(let order of orders) {
//			if(this.trendingStrategy.usesDynamicExit) {
//				const dynamicExit = await this.trendingStrategy.dynamicExit(this.exchange, order.symbol, this.timeframe, order.orderType == 'long' ? TradeDirection.BUY : TradeDirection.SELL);
//				if(dynamicExit) {
//					this.dynamicExits.push(dynamicExit);
//				}
//			}
//		}
//		
//        while(true) {
//            const symbols = await getMarketSymbols(this.exchange);
//
//            for(let symbol of symbols) {
//                try{
//                    const data: OHLCV[] = await this.exchange.fetchOHLCV(symbol, this.timeframe);
//                    const trend: Trend = MarketTrend.renko(data);
//
//                    if(trend == Trend.DOWN || trend == Trend.UP) {
//                        // trending environment
//                        await this.useStrategy(data, symbol, this.trendingStrategy);
//                    } else if(trend == Trend.SIDE) {
//                        // ranging environment
//                        await this.useStrategy(data, symbol, this.rangingStrategy);
//                    }
//					if(this.trendingStrategy.usesDynamicExit) {
//						await this.checkDynamicExit();
//					} else {
//						await this.checkNormalExits();
//					}
//                } catch(err) {
//                    console.log(err);
//                }
//            }
//            console.log('round finished ', this.instance);
//			console.log('dymaic excits: ', this.dynamicExits.map((d) => d.symbol), 'of instance:', this.instance);
//        }
//    }
//	
//	private async checkNormalExits() {
//		const orders = await this.db.loadOrder();
//		for(let order of orders) {
//			const data: OHLCV[] = await this.exchange.fetchOHLCV(order.symbol, this.timeframe);
//			const price = data[data.length-1][Candlestick.CLOSE];
//			if(order.orderType == 'long') {
//				if(order.stops > price || order.target < price) {
//					await this.closePosition(order.symbol);
//				}
//			} else if(order.orderType == 'short') {
//				if(order.stop < price || order.target > price) {
//					await this.closePosition(order.symbol);
//				}
//			}
//			this.normalPositions = this.normalPositions.filter(position => position != order.symbol);
//		}
//	}
//
//	private async checkDynamicExit() {
//        for(let exit of this.dynamicExits) {
//            if(await exit.exitTrade()) {
//                console.log('exiting:', exit.symbol, 'instance:', this.instance);
//                await this.closePosition(exit.symbol);
//                this.dynamicExits = this.dynamicExits.filter((ex) => !(ex.symbol == exit.symbol));
//            }
//        } 
//    }
//
//    private async useStrategy(data: OHLCV[], symbol: string, strategy: IStrategy) {
//        const tradeDirection: TradeDirection = await strategy.calculate(data, this.exchange, symbol, this.timeframe);
//        if(!(tradeDirection == TradeDirection.HOLD)) {
//            if(!strategy.usesDynamicExit) {
//                console.log('Takeing position', symbol, '. Direction:', tradeDirection, 'instance:', this.instance);
//				const sl = await strategy.getStopLossTarget(data, tradeDirection);
//				if(await this.position(symbol, sl.stops, sl.targets, tradeDirection)) {
//					this.normalPositions.push(symbol);
//				}
//            } else {
//				const sl = await strategy.getStopLossTarget(data, tradeDirection);
//				if(await this.position(symbol, sl.stops, sl.targets, tradeDirection)){
//					const dynamicExit = await strategy.dynamicExit(this.exchange, symbol, this.timeframe, tradeDirection);
//					if(dynamicExit) {
//						this.dynamicExits.push(dynamicExit);
//					} else {
//						throw 'dynamic exit was specified but dynamic exit class was provided';
//					}
//				}
//            }
//        }
//    }
//
//	private async position(symbol: string, stopLosses: LimitOrder[], targets: LimitOrder[], tradeDirection: TradeDirection): Promise<boolean> {
//		console.log('position created on ', symbol, 'instance:', this.instance);
//		let risk = 0.02
//		let quoteCurrcey = 'USDT';
//		const envQuote = process.env.QUOTE_CURRENCY;
//		const envRisk = process.env.RISK;
//		if(envRisk && envQuote) {
//			risk = parseFloat(envRisk);
//			quoteCurrcey = envQuote;
//		}
//
//		const orders = await this.db.loadOrder();
//		const maxPosEnv = process.env.MAX_POSITIONS;
//		let maxPos = 5;
//		if(maxPosEnv){
//			maxPos = parseFloat(maxPosEnv);
//		}
//		if(orders.filter(order => order.symbol == symbol).length > 0 || orders.length >= maxPos) {
//			return false;
//		}
//
//		const data = await this.exchange.fetchOHLCV(symbol, this.timeframe);
//		const cryptos = await this.db.loadCryptos();
//		const balance = cryptos.filter(crypto => crypto.currencyCode == quoteCurrcey)[0];
//		
//		const currentPrice = data[data.length-1][Candlestick.CLOSE];
//		let size = PositionSize.calculate(risk, balance.free, currentPrice, stopLosses);
//
//		if(TradeDirection.SELL == tradeDirection) {
//			size = -size;
//		}
//
//		await this.db.saveOrder(tradeDirection == TradeDirection.BUY ? 'long' : 'short', symbol, size, stopLosses, targets, currentPrice);
//		await this.db.logTrade(symbol, balance.free, size, tradeDirection);
//		return true;
//	}
//
//	private async closePosition(symbol: string): Promise<boolean> {
//		console.log('closing position', symbol, 'instance:', this.instance);
//		let quoteCurrcey = 'USDT';
//		const envQuote = process.env.QUOTE_CURRENCY;
//		if(envQuote) {
//			quoteCurrcey = envQuote;
//		}
//
//		const position: IOrder = (await this.db.loadOrder()).filter(order => order.symbol == symbol)[0];
//		const data: OHLCV[] = await this.exchange.fetchOHLCV(symbol, this.timeframe);
//		const price: number = data[data.length-1][Candlestick.CLOSE];
//
//		const balance: ICryptoCurrency = (await this.db.loadCryptos()).filter(crypto => crypto.currencyCode == quoteCurrcey)[0];
//		const fees = 2 * price * Math.abs(position.amount) * FEES;
//		
//		this.checkWinLose((price - position.buyPrice) * position.amount - fees);
//
//		balance.free +=  (price - position.buyPrice) * position.amount - fees;
//		if(balance.free < 0) {
//			return false;
//		} 
//
//		await this.db.updateCrypto(balance);
//		await this.db.removeOrder(position._id);
//		await this.db.logTrade(symbol, balance.free, position.amount, position.orderType == 'long' ? TradeDirection.BUY : TradeDirection.SELL);
//		return true;
//	}
//
//	checkWinLose(moneyDiff: number) {
//		if(moneyDiff < 0) {
//			console.log('lose,', moneyDiff, 'on instance:', this.instance);
//			this.loses++;
//		} else {
//			console.log('win,', moneyDiff, 'on instance:', this.instance);
//			this.wins++;
//		}
//		console.log('wins:', this.wins, 'loses:', this.loses);
//	}
//}