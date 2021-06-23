import { OHLCV } from "ccxt";
import { Candlestick } from "../Consts/Candlestick";

export class PivotExtremes {
    public static asBoolArray(data: OHLCV[], length: number): {highs: boolean[], lows: boolean[]} {
        return {highs: this.pivot(data, length, true, Candlestick.HIGH), lows: this.pivot(data, length, false, Candlestick.LOW)};
    }

    public static oscAsBoolArray(data: number[], length: number, midPoint: number | undefined = undefined): {highs: boolean[], lows: boolean[]} {
        const values: OHLCV[] = data.map((d) => [d, d, d, d, d, d]);
        let highs = this.pivot(values, length, true, Candlestick.HIGH);
        let lows = this.pivot(values, length, false, Candlestick.LOW);

        // eliminate lows on other side of midpoint
        if(midPoint != undefined) {
            highs = highs.map((high, index) => {
                if(high) {
                    return data[index] > 0;
                }
                return high;
            });

            lows = lows.map((low, index) => {
                if(low) {
                    return data[index] < 0;
                }
                return low;
            });
        }

        return {highs, lows};
    }


    public static lastHighPivotIndex(data: OHLCV[], length: number): number | undefined {
        const pivots = this.pivot(data, length, true, Candlestick.HIGH);
        for(let i: number = pivots.length-1; i > 0; i--) {
            if(pivots[i]) {
                return i;
            }
        }
        return undefined;
    }

    private static pivot(src: OHLCV[], len: number, isHigh: boolean, candlestick: Candlestick): boolean[] {
        const pivots: boolean[] = new Array(src.length).fill(false);

        for(let i = src.length - 1 - len; i > len; i--) {
            let isFound: boolean = true;
            let p: number = src[i][candlestick];
            for(let u = i + 1; u < i + len; u++) {
                if(isHigh && src[u][candlestick] > p) {
                    isFound = false;
                    break;
                } else if(!isHigh && src[u][candlestick] < p) {
                    isFound = false;
                    break;
                }
            }
            if(isFound) {
                for(let u = i - 1; u > i - len; u--) {
                    if(isHigh && src[u][candlestick] > p) {
                        isFound = false;
                        break;
                    } else if(!isHigh && src[u][candlestick] < p) {
                        isFound = false;
                        break;
                    }
                }
            }
            if(isFound) {
                pivots[i] = true;
            }
        }
        return pivots;
    }

    public static leftHigh(data: OHLCV[], index: number): {index: number, high: number} {
		let i = index - 1;
		let high = data[index][Candlestick.HIGH];
		for(; i >= 0; i--) {
			if (data[i][Candlestick.HIGH] > high) {
				high = data[i][Candlestick.HIGH];
			} else {
				break;
			}
		}
		return {index: i, high}
	}

    public static leftLow(data: OHLCV[], index: number): {index: number, low: number} {
		let i = index - 1;
		let low = data[index][Candlestick.LOW];
		for(; i >= 0; i--) {
			if (data[i][Candlestick.LOW] < low) {
				low = data[i][Candlestick.LOW];
			} else {
				break;
			}
		}
		return {index: i, low}
	}
}