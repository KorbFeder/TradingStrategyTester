import { OHLCV } from "ccxt";

export class Candlestick {
    public static TIMESTAMP = 0; 
    public static OPEN = 1; 
    public static HIGH = 2; 
    public static LOW = 3; 
    public static CLOSE = 4; 
    public static VOLUMN = 5;


    static high(data: OHLCV[], index: number = data.length-1): number {
        return data[index][Candlestick.HIGH];
    }

    static high_all(data: OHLCV[]): number[] {
        return data.map(d => this.high([d]));
    }

    static low(data: OHLCV[], index: number = data.length-1): number {
        return data[index][Candlestick.LOW];
    }

    static low_all(data: OHLCV[]): number[] {
        return data.map(d => this.low([d]));
    }

    static open(data: OHLCV[], index: number = data.length-1): number {
        return data[index][Candlestick.OPEN];
    }

    static open_all(data: OHLCV[]): number[] {
        return data.map(d => this.open([d]));
    }

    static close(data: OHLCV[], index: number = data.length-1): number {
        return data[index][Candlestick.CLOSE];
    }

    static close_all(data: OHLCV[]): number[] {
        return data.map(d => this.close([d]));
    }

    static timestamp(data: OHLCV[], index: number = data.length-1): number {
        return data[index][Candlestick.TIMESTAMP];
    }

    static timestamp_all(data: OHLCV[]): number[] {
        return data.map(d => this.timestamp([d]));
    }

    static volumn(data: OHLCV[], index: number = data.length-1): number {
        return data[index][Candlestick.VOLUMN];
    }

    static volumn_all(data: OHLCV[]): number[] {
        return data.map(d => this.high([d]));
    }

    static hlc3(data: OHLCV[], index: number = data.length-1): number {
        return (this.high(data, index) + this.low(data, index) + this.close(data, index)) / 3;
    }

    static hlc3_all(data: OHLCV[]): number[] {
        return data.map(d => this.hlc3([d])); 
    }
}