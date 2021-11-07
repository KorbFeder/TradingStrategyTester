import * as ccxt from "ccxt";
import { config } from "dotenv";
import {Lowest, mfi, RSI } from "technicalindicators";
import { calcStartingTimestamp, Timeframe } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { Database } from "./Database";
import { CandlestickPatterns } from "./Technicals/CandlestickPatterns";
import { Divergence } from "./Technicals/Divergence";
import { PivotExtremes } from "./Technicals/PivotExtremes";
import { BollingerBandsStrategy } from "./Strategies/BollingsBandsStrategy";
import { FibRetracementStrategy } from "./Strategies/FibRetracementStrategy";
import { MaCrossStrategy } from "./Strategies/MaCrossStrategy";
import { SimpleMomentumStrategy } from "./Strategies/SimpleMomentumStrategy";
import { Trading } from "./Tradeing";
import { Renko } from "./Technicals/Renko";
import { KeySRLevels } from "./Technicals/KeySRLevels";
import { getMarketSymbols } from "./helper";
import { AOdivergenceStrategy } from "./Strategies/AOdivergenceStrategy";
import { startServer } from "./GUI/backendApi";
import { Trend } from "./Consts/Trend";
import { MarketTrend } from "./Technicals/MarketTrend";
import { saveDataASFile } from "./GUI/saveDataAsFile";
import { Orders } from "./Orders/Orders";
import { FuturePosition } from "./Models/FuturePosition-interface";
import { RenkoEmaStrategy } from "./Strategies/RenkoEmaStrategy";
import { SmoothRsi } from "./Technicals/SmoothRsi";
import { DivergenceStrategy } from "./Strategies/DivergenceStrategy";
import { WilliamsFractals } from "./Technicals/WilliamsFractals";
import { SmaFractialsStrategy } from "./Strategies/SmaFractalsStrategy";
import { RsiDivergenceStrategy } from "./Strategies/RsiDivergenceStrategy";
import { SingleTest } from "./Testing/SingleTest";
import { MfiDivergenceStrategy } from "./Strategies/MfiDivergenceStrategy";
import { MFI } from "./Technicals/MFI";
import { CciDivergenceStrategy } from "./Strategies/CciDivergenceStrategy";
import { AdlDivergenceStrategy } from "./Strategies/AdlDivergenceStrategy";
import { MacdDivergenceStrategy } from "./Strategies/MacdDivergenceStrategy";
import { ADXInput, ADXOutput } from "technicalindicators/declarations/directionalmovement/ADX";
import { Candlestick } from "./Consts/Candlestick";
import { IStrategy } from "./Models/Strategy-interface";
import { DivergenceTrendStrategy } from "./Strategies/DivergenceTrendStrategy";
import { ApiServer } from "./ApiEndpoint/ApiServer";
import { HiddenRsiStochStrategy } from "./Strategies/HiddenRsiStochStrategy";
import * as yargs from 'yargs';
import { json } from "express";
import { ITradingAccount } from "./Models/TradingAccount-interface";
import { TestAccount } from "./Testing/TestAccount";
import { ManageDynMultiPostionOffline } from "./Orders/ManageDynMultiPositionOffline";
import { ManageMultipartPostionOffline } from "./Orders/ManageMultipartPositionOffline";
import { ChoppinessIndex } from "./Technicals/ChoppinessIndex";
import { ConsolidationFindingStrategy } from "./Strategies/ConsolidationFindingStrategy";
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
import { MarketStructureBackTest } from "./Testing/MarketStructureBackTest";
import { fetchWithDate } from "./helpers/fetchWithDate";
import { BacktestConfig, Backtesting } from "./Testing/Backtesting";
import { ManageDefaultPosition } from "./Orders/ManageDefaultPositionOffline";

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

//const apiServer: ApiServer = new ApiServer(exchange);
//apiServer.startServer();

async function run(runningInstance: number = 0) {
    await db.connect(runningInstance);
    const backtest = new Backtesting(exchange, new ManageDefaultPosition());
    const config: BacktestConfig = {
        startDate: new Date(Date.UTC(2021, 9, 13)),
        endDate: new Date(Date.UTC(2021, 9, 14)),
        symbol: 'BTC-PERP',
        timeframe: Timeframe.h1,
        strategy: new MaCrossStrategy(11, 25)
    };
    const perf = backtest.start(config);
    console.log(perf);

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


