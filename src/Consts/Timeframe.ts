export enum Timeframe {
    m1 = '1m',
    m5 = '5m',
    m15 = '15m',
    m30 = '30m',
    h1 = '1h',
    h4 = '4h',
    d1 = '1d',
    w1 = '1W',
    Mo1 = '1M'
};

export function nextTimeframe(timeframe: Timeframe): Timeframe {
    switch(timeframe) {
        case Timeframe.m1:
            return Timeframe.m5;
        case Timeframe.m5:
            return Timeframe.m15;
        case Timeframe.m15:
            return Timeframe.m30;
        case Timeframe.m30:
            return Timeframe.h1;
        case Timeframe.h1:
            return Timeframe.h4;
        case Timeframe.h4: 
            return Timeframe.d1;
        case Timeframe.d1:
            return Timeframe.w1;
        case Timeframe.w1:
            return  Timeframe.Mo1;
        case Timeframe.Mo1:
            return Timeframe.m1;
    }
}

