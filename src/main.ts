import * as ccxt from "ccxt";
import { config } from "dotenv";
import { Lowest, mfi, RSI } from "technicalindicators";
import { calcStartingTimestamp, Timeframe, timeToNumber } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { Database } from "./Database/Database";
import { CandlestickPatterns } from "./Technicals/CandlestickPatterns";
import { Divergence } from "./Technicals/Divergence";
import { PivotExtremes } from "./Technicals/PivotExtremes";
import { MaCrossStrategy } from "./Strategies/MaCrossStrategy";
import { Renko } from "./Technicals/Renko";
import { KeySRLevels } from "./Technicals/KeySRLevels";
import { getMarketSymbols } from "./helper";
import { Trend } from "./Consts/Trend";
import { MarketTrend } from "./Technicals/MarketTrend";
import { Orders } from "./Orders/Orders";
import { FuturePosition } from "./Models/FuturePosition-interface";
import { SmoothRsi } from "./Technicals/SmoothRsi";
import { WilliamsFractals } from "./Technicals/WilliamsFractals";
import { MFI } from "./Technicals/MFI";
import { ADXInput, ADXOutput } from "technicalindicators/declarations/directionalmovement/ADX";
import { Candlestick } from "./Consts/Candlestick";
import { IStrategy } from "./Models/Strategy-interface";
import * as yargs from 'yargs';
import { json } from "express";
import { ITradingAccount } from "./Models/TradingAccount-interface";
import { TestAccount } from "./Testing/TestAccount";
import { ChoppinessIndex } from "./Technicals/ChoppinessIndex";
import { Screening } from "./Screening";
import { ChoppinessIndexScreener } from "./Screeners/ChoppinessIndexScreener";
import { MarketStructureScreener } from "./Screeners/MarketStructureScreener";
import { FindLiqMoves } from "./Technicals/FindLiqMoves";
import { LiqMoveScreener } from "./Screeners/LiqMoveScreener";
import { ADX } from "./Technicals/ADX";
import { TrendType } from "./Technicals/TrendType";
import { Alert } from "./Alerts/Alert";
import { Cli } from "./CLI/Cli";
import { Delta } from "./Technicals/Delta";
import { HurstExponent } from "./Technicals/MarketStructure/HurstExponent";
import { Backtesting } from "./Testing/Backtesting";
import { ATR } from "./Technicals/ATR";
import { ManageDefaultPosition } from "./Orders/ManageDefaultPosition";
import { ManagementType } from "./Models/ManagePosition-interface";
import { SMAnt } from "./Technicals/SMAnt";
import { ManageFixedBarExit } from "./Orders/ManageFixedBarExit";
import { NormalCheck } from "./Testing/ResultChecking/NormalCheck";
import { DataCache } from "./Database/DataCache";
import { BybitTrades } from "./Testing/HistoricTrades/BybitTrades";
import { Optimizing } from "./Testing/Optimizing";
import { BacktestConfig, OptimizationConfig, WalkForwardConfig } from "./Models/TestingConfigs";
import { WalkForwardAnalysis } from "./Testing/WalkForwardAnalysis";

const db: Database = new Database()

config();


const exchangeId = 'ftx';
const exchangeClass = ccxt[exchangeId];
const exchange = new exchangeClass ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.SECRET,
    'timeout': 30000,
    'enableRateLimit': true,
});
exchange.headers = {
    'FTX-SUBACCOUNT': 'Bot',
}
exchange.options = {
    defaultMarket: 'futures'
};

const coinbase = new ccxt.coinbasepro({
    'timeout': 30000,
    'enableRateLimit': true,
});

//const apiServer: ApiServer = new ApiServer(exchange);
//apiServer.startServer();

async function run(runningInstance: number = 0) {
    //const data = await coinbase.fetchOHLCV('BTC/USD', Timeframe.h1, new Date(Date.UTC(2021, 10, 4)).getTime(), 143);
    //const result = ATR.calcNt(data, 14);

    await db.connect(runningInstance);
    const bybit: BybitTrades = new BybitTrades();

    const config: WalkForwardConfig = {
        startDate: new Date(Date.UTC(2021, 0, 1)),
        endDate: new Date(Date.UTC(2021, 2, 1)),
        symbol: 'BTC/USD',
        timeframe: Timeframe.m15,
        strategy: new MaCrossStrategy('BTC/USD', Timeframe.m15 ,11, 25),
        includeComissions: false,
        optimizationFunction: 'profitFactor',
        useNeighbours: 1,
        numOfStages: 6,
        backtestToOptRatio: 0.25 
    };


    const walkforward = new WalkForwardAnalysis(exchange, new NormalCheck());
    const walk = await walkforward.start(config)
    console.log(walk);
    //const backtest = new Backtesting(coinbase, new NormalCheck());
    //const topParams = await backtest.start(config);
    //const optimization = new Optimizing(exchange, new NormalCheck());
    //const topParams = await optimization.start(config, );
    //console.log(topParams);
    //const backtest = new Backtesting(exchange, new NormalCheck());
    //const d = await backtest.start(config);
    //const pipeline = new TestingPipeline(coinbase);
    //const results = await pipeline.start(config, new NormalCheck());
    //console.log(results);
    //const perf = await backtest.start(config);
    //console.log(perf);
    
//    const a = await fetchWithDate(exchange, 'BTC-PERP', Timeframe.h1, new Date(2021, 4, 4, 11), new Date(2021, 4, 4, 12));
//    const start = new MaCrossStrategy(50, 200);
//    const result = await start.calculate(a);

    //const data = await exchange.fetchOHLCV('BTC-PERP', Timeframe.m1);
    //const hurst = new HurstExponent();
    //const marketStructureTest = new MarketStructureBackTest(exchange);
    //const result = marketStructureTest.testAll(hurst);

    //const delta = new Delta();
    //delta.getFootprint(exchange, 'BTC-PERP', Timeframe.m15, 10, new Date(2021, 9, 15, 0, 15).getTime(), new Date(2021, 9, 16, 1, 0).getTime());

    //onst trades = await  exchange.fetchTrades('BTC-PERP', undefined, undefined, {'start_time': new Date(2021, 1, 15, 9).getTime() / 1000, 'end_time': new Date(2021, 1, 15, 10).getTime() / 1000});
    //const date = new Date(trades[0].datetime);
    //const pastTrades: ccxt.Trade[] = [];
    //while(true) {
    //    const trades = await  exchange.fetchTrades('LTC-PERP');
    //    for(let i = 0; i < trades.length; i++) {
    //        if(!pastTrades.map((t) => t.id).includes(trades[i].id)) {
    //            pastTrades.push(trades[i]);
    //            console.log(trades[i].amount);
    //        }
    //    }
    //}

    //const cli = new Cli(exchange, db);
    //await cli.start();
    
    //const ci = new ConsolidationFindingStrategy();
    //const managePosition = new ManageDynMultiPostionOffline();

    //const backtest = new Backtesting(exchange, db, 'test1', managePosition);
    //const res = await backtest.testAll(Timeframe.m5, ci);
    //res.printStatistics();
    //const data: ccxt.OHLCV[] = await exchange.fetchOHLCV('BNB-PERP', Timeframe.h4);
    //const input: ADXInput = {
    //    high: Candlestick.high_all(data),
    //    low: Candlestick.low_all(data),
    //    close: Candlestick.close_all(data),
    //    period: 14
    //};

    //const adxResult: ADXOutput[] = ADX.calculate(input);
    //const adxCurrent = adxResult[adxResult.length-1];
    //const trendType = TrendType.calculate(data);
    


    //const liqMoveScreener = new LiqMoveScreener(50);
    //const chop = new ChoppinessIndexScreener();
    //const structure: MarketStructureScreener = new MarketStructureScreener();
    //const screener: Screening = new Screening(exchange, chop);
    //await screener.start();

   
    //const a = WilliamsFractals.calculate(data);

    //console.log('test');
    //const key = new KeySRLevels(exchange);
    //const level = await key.renko('BTC-PERP', Timeframe.m1);
    //const trend = MarketTrend.renko(data);
    //saveDataASFile(data);

    //const div = new DivergenceStrategy();
    //const renkoEma = new RenkoEmaStrategy();

//    const startingTime = calcStartingTimestamp(Timeframe.h4, 1589875200000, 500);
//    console.log(startingTime);
//    const data: ccxt.OHLCV[] = await exchange.fetchOHLCV('BTC-PERP', Timeframe.h4, startingTime, 500);
//
//    const {tradeDirection} = Divergence.hiddenRsi(data);
//


    //console.log(divResult);
    //console.log(renkoResult);
    //const liveTesting0: FrontTesting = new FrontTesting(exchange, Timeframe.m5, renkoEma, renkoEma, 0);
    //const liveTesting1: FrontTesting = new FrontTesting(exchange, Timeframe.m5, div, div, 1);
    //liveTesting0.start();
    //liveTesting1.start();
    //const tradeing: Trading = new Trading(exchange, renkoEma, renkoEma, Timeframe.m5);
    //await tradeing.trade();
}


run(0);


