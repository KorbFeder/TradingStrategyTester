import * as ccxt from "ccxt";
import { config } from "dotenv";
import { RsiStrategy } from "./Strategies/RsiStrategy";
import { Timeframe } from "./Consts/Timeframe";
import { Database } from "./Database";
import { Trading } from "./Tradeing";
import { ExchangeAccount } from "./ExchangeAccount";
import { OfflineAccount } from "./OfflineAccount";

config();

const exchangeId = 'binance';
const exchangeClass = ccxt[exchangeId];
const exchange = new exchangeClass ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.SECRET,
    'timeout': 30000,
    'enableRateLimit': true,
});

async function run(runningInstance: number = 0) {
    const db: Database = new Database();
    await db.connect(exchange);
    const rsi: RsiStrategy = new RsiStrategy(exchange, Timeframe.m15);
    const strategies = [rsi];
    //const account = new ExchangeAccount(exchange);
    const account = new OfflineAccount(exchange, db);

    const tradeing: Trading = new Trading(exchange, account, strategies, Timeframe.m15);
    tradeing.trade();
}

run(0);


