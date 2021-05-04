import * as ccxt from "ccxt";

export class MovingAvarageStrategy {
    static MovingAverage(data: ccxt.OHLCV[], length: number, offset: number = 0): number {
        if (length < offset) {
            throw "Error, offset bigger than length in Moving Avarage";
        }
        let sum = 0;
        for(let i = data.length - 1 - offset; i > data.length - 1 - length - offset; i--) {
            sum += data[i][4];
        }
        return sum / length; 
    }
}