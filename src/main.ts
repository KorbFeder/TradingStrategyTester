import * as ccxt from "ccxt";
import { config } from "dotenv";
import { getFees, getMarketSymbols, sleep } from "./helper";
import { RsiStrategy } from "./Strategies/RsiStrategy";
import { Timeframe } from "./Consts/Timeframe";
import { TradeDirection } from "./Consts/TradeDirection";
import { Database } from "./Database";
import { Trading } from "./Tradeing";
import { ExchangeAccount } from "./ExchangeAccount";

config();

const exchangeId = 'binance';
const exchangeClass = ccxt[exchangeId];
const exchange = new exchangeClass ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.SECRET,
    'timeout': 30000,
    'enableRateLimit': true,
});

async function init() {
    //const filteredMarket1 = filteredMarket.map(([symbol, market][string, ccxt.Market]) => )
}

async function run(runningInstance: number = 0) {
    //const db: Database = new Database();
    //const symbols = await getMarketSymbols(exchange);
    //const portfolio: Portfolio = new Portfolio(exchange, runningInstance, db, Timeframe.m15);
    //.portfolio.init(symbols);
    //const account = new ExchangeAccount(exchange);
     

    const rsi: RsiStrategy = new RsiStrategy(exchange, Timeframe.m15);
    const strategies = [rsi];
    const account = new ExchangeAccount(exchange);

    const tradeing: Trading = new Trading(exchange, account, strategies, Timeframe.m15);
    tradeing.trade();
}

run(0);


