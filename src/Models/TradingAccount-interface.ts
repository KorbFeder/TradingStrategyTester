export enum OrderStatus {
    OPEN = "open", CLOSE = "close", CANCELED = "canceled"
};

export interface ITradingAccount {
    buy(symbol: string, amount: number, pricePerCoin: number): Promise<string>;
    sellStopLossTarget(symbol: string, amount: number, stop: number, target: number): Promise<{stopId: string | undefined, targetId: string | undefined}>;

    getBalance(symbol: string): {free: number, used: number} | Promise<{free: number, used: number}>;
    getOpenOrders(symbol: string): Promise<string[]> | string[];
    getOrderStatus(id: string, symbol: string): Promise<OrderStatus> | OrderStatus;
    getAllOpenOrders(): Promise<string[]>;
}