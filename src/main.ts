import * as ccxt from "ccxt";
import { config } from "dotenv";
import { mfi, RSI } from "technicalindicators";
import { Timeframe } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { Database } from "./Database";
import { CandlestickPatterns } from "./Technicals/CandlestickPatterns";
import { Divergence } from "./Technicals/Divergence";
import { PivotExtremes } from "./Technicals/PivotExtremes";
import { BollingerBandsStrategy } from "./Strategies/BollingsBandsStrategy";
import { FibRetracementStrategy } from "./Strategies/FibRetracementStrategy";
import { MaCrossStrategy } from "./Strategies/MaCrossStrategy";
import { SimpleMomentumStrategy } from "./Strategies/SimpleMomentumStrategy";
import { Backtesting, TestResult } from "./Testing/Backtesting";
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
import { FrontTesting } from "./Testing/FrontTesting";
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

async function run(runningInstance: number = 0) {
    await db.connect(runningInstance);

    const data: ccxt.OHLCV[] = await exchange.fetchOHLCV('BTC-PERP', Timeframe.h4);
    const a = MFI.calculate(data);
    //const a = WilliamsFractals.calculate(data);

    //console.log('test');
    //const key = new KeySRLevels(exchange);
    //const level = await key.renko('BTC-PERP', Timeframe.m1);
    //const trend = MarketTrend.renko(data);
    //saveDataASFile(data);
    const backTest: Backtesting = new Backtesting(exchange, db);

    //const div = new DivergenceStrategy();
    //const renkoEma = new RenkoEmaStrategy();
    const mfiStrat = new MfiDivergenceStrategy();
    const rsiStrat = new RsiDivergenceStrategy();
    const cciStrat = new CciDivergenceStrategy();
    const adlStrat = new AdlDivergenceStrategy();
    const macdStrat = new MacdDivergenceStrategy();
    //SingleTest.start(exchange, 'BTC-PERP', Timeframe.m5, new Date(2021, 5, 22, 12, 10, 0, 0), rsiStrat, TradeDirection.BUY);
    //const divResult: TestResult[] = await backTest.testAll(Timeframe.m5, div, 'Divergence Strategy')
    const tf: Timeframe = Timeframe.m1;
    const mfiDiv: TestResult = await backTest.testAll(tf, mfiStrat, 'MFI Div');
    const rsiDiv: TestResult = await backTest.testAll(tf, rsiStrat, 'RSI Div');
    const cciDiv: TestResult = await backTest.testAll(tf, cciStrat, 'CCI Div');
    const adlDiv: TestResult = await backTest.testAll(tf, adlStrat, 'ADL Div');
    const macdDiv: TestResult = await backTest.testAll(tf, macdStrat, 'MACD Div');

    print(mfiDiv, 'mfi');
    print(rsiDiv, 'rsi');
    print(cciDiv, 'cci');
    print(adlDiv, 'adl');
    print(macdDiv, 'macd');
    //console.log(divResult);
    //console.log(renkoResult);
    //const liveTesting0: FrontTesting = new FrontTesting(exchange, Timeframe.m5, renkoEma, renkoEma, 0);
    //const liveTesting1: FrontTesting = new FrontTesting(exchange, Timeframe.m5, div, div, 1);
    //liveTesting0.start();
    //liveTesting1.start();
    //const tradeing: Trading = new Trading(exchange, renkoEma, renkoEma, Timeframe.m5);
    //await tradeing.trade();
}

function print(rsiDiv: TestResult, name: string) {
    console.log(name, 'wins:', rsiDiv.winsLong + rsiDiv.winsShort, 'loses: ', rsiDiv.losesLong + rsiDiv.losesShort, 'winrate:', 
        (rsiDiv.winsLong + rsiDiv.winsShort) / (rsiDiv.losesLong + rsiDiv.losesShort + rsiDiv.winsLong + rsiDiv.winsShort));
}

run(0);


