import { Exchange, OHLCV } from "ccxt";
import { nextTimeframe, Timeframe } from "../Consts/Timeframe";

export class PivotLevels {
    async calculate(symbol: string, exchange: Exchange, timeframe: Timeframe) {
        const pivotTimeframe: Timeframe = nextTimeframe(nextTimeframe(timeframe));
        const pivotData: OHLCV[] = await exchange.fetchOHLCV(symbol, pivotTimeframe)

        const currentOHLCV: OHLCV = pivotData[pivotData.length-1];
        const pivotPoint = (currentOHLCV[4] + currentOHLCV[2] + currentOHLCV[3]) / 3;
        const R1 = pivotPoint * 2 - currentOHLCV[3];
        const S1 = pivotPoint * 2 - currentOHLCV[2];
        const R2 = pivotPoint + currentOHLCV[2] - currentOHLCV[3];
        const S2 = pivotPoint - currentOHLCV[2] - currentOHLCV[3];
        const R3 = currentOHLCV[2] + 2 * (pivotPoint - currentOHLCV[3]);
        const S3 = currentOHLCV[3] + 2 * (currentOHLCV[2] - pivotPoint);

        return {S1, R1, S2, R2, S3, R3};
    }
}