export enum OrderStatus {
    OPEN = "open", CLOSE = "close", CANCELED = "canceled"
};

export interface ITradingAccount {
    buy(symbol: string, amount: number, pricePerCoin: number): Promise<boolean>;
    sellStopLossTarget(symbol: string, stop: number, target: number): Promise<boolean>;

    isSameTradeInProcess(symbol: string): Promise<boolean>;
    getBalance(currencyCode: string): Promise<{free: number, used: number}>;
    getOldBuyOrders(): Promise<{symbol: string, stop: number, target: number}[]>;
    getOpenOrdersCount(): Promise<number>;
    getTradeResults(): boolean[];
}