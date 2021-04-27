import * as ccxt from "ccxt";
import { config } from "dotenv";
import { RsiStrategy } from "./RsiStrategy";
import { Timeframe } from "./Timeframe";
import { TradePressure } from "./TradePressure";

config();

const exchangeId = 'binance';
const exchangeClass = ccxt[exchangeId];
const exchange = new exchangeClass ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.SECRET,
    'timeout': 30000,
    'enableRateLimit': true,
});



async function run() {
    await exchange.loadMarkets();
    const markets: ccxt.Dictionary<ccxt.Market> = exchange.markets;
    const filteredMarket = Object.entries(markets).filter(([symbol, market]: [string, ccxt.Market]) => market.quote == 'USDT');
    const rsi: RsiStrategy = new RsiStrategy(exchange, 'MATIC/USDT', Timeframe.m15);
    const result = await rsi.tradeIndicator();
    if (result == TradePressure.BUY) {
        console.log("buy");
    } else if(result == TradePressure.SELL) {
        console.log("sell");
    } else {
        console.log("hold");
    }
}

run();


