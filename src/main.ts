import * as ccxt from "ccxt";
import { config } from "dotenv";
import { RSI } from "technicalindicators";
import { Timeframe } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { Database } from "./Database";
import { OfflineAccount } from "./OfflineAccount";
import { CandlestickPatterns } from "./Technicals/CandlestickPatterns";
import { Divergence } from "./Technicals/Divergence";
import { PivotExtremes } from "./Technicals/PivotExtremes";
import { BollingerBandsStrategy } from "./Strategies/BollingsBandsStrategy";
import { FibRetracementStrategy } from "./Strategies/FibRetracementStrategy";
import { MaCrossStrategy } from "./Strategies/MaCrossStrategy";
import { SimpleMomentumStrategy } from "./Strategies/SimpleMomentumStrategy";
import { Backtesting } from "./Testing/Backtesting";
import { DefaultTest } from "./Testing/DefaultTest";
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

const db: Database = new Database();
config();
startServer(db);

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
    await db.connect(exchange);
    
    const renkoEma = new RenkoEmaStrategy();

    //const trend = MarketTrend.renko(data);
    //saveDataASFile(data);

    const tradeing: Trading = new Trading(exchange, renkoEma, renkoEma, Timeframe.m5);
    await tradeing.trade();
}

run(0);


