export enum OrderStatus {
    OPEN = "open", CLOSE = "close", CANCELED = "canceled"
};

export interface ITradingAccount {
    buy(symbol: string, amount: number, pricePerCoin: number): Promise<string | undefined>;
    sellStopLossTarget(symbol: string, amount: number, stop: number, target: number): Promise<{stopId: string, targetId: string} | undefined>;

    getBalance(currencyCode: string): Promise<{free: number, used: number}>;

    getOpenOrders(symbol: string): Promise<string[]>;
    getOrderStatus(id: string, symbol: string): Promise<OrderStatus>;
    getAllOpenOrders(): Promise<string[]>;
}