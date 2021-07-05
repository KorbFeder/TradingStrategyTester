// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © wugamlo

import { OHLCV } from "ccxt"
import { Candlestick } from "../Consts/Candlestick"


// This experimental Indicator helps identifying instituational Order Blocks. 
// Often these blocks signal the beginning of a strong move, but there is a significant probability that these price levels will be revisited at a later point in time again. 
// Therefore these are interesting levels to place limit orders (Buy Orders for Bullish OB / Sell Orders for Bearish OB). 
//
// A Bullish Order block is defined as the last down candle before a sequence of up candles. (Relevant price range "Open" to "Low" is marked)  / Optionally full range "High" to "Low"
// A Bearish Order Block is defined as the last up candle before a sequence of down candles. (Relevant price range "Open" to "High" is marked) / Optionally full range "High" to "Low"
//
// In the settings the number of required sequential candles can be adjusted. 
// Furthermore a %-threshold can be entered. It defines which %-change the sequential move needs to achieve in order to identify a relevant Order Block. 
// Channels for the last Bullish/Bearish Block can be shown/hidden.
//
// In addition to the upper/lower limits of each Order Block, also the equlibrium (average value) is marked as this is an interesting area for price interaction.
//
// Alerts added: Alerts fire when an Order Block is detected. The delay is based on the "Relevant Periods" input. Means with the default setting "5" the alert will trigger after the 
// number of consecutive candles is reached.


export class Orderblock {
	async calc(data: OHLCV[]) {
		const periods: number = 5                // Required number of subsequent candles in the same direction to identify Order Block
		//const threshold: number = input(0.0,   "Min. Percent move to identify OB", step = 0.1)   // Required minimum % move (from potential OB close to last subsequent candle to identify Order Block)
		const threshold: number = 0;
		const usewicks  = false;

		const ob_period: number = periods + 1                                                    // Identify location of relevant Order Block candle
		const absmove: number = ((Math.abs(data[data.length - 1 - ob_period][Candlestick.CLOSE] - data[data.length-1-1][Candlestick.CLOSE])) / data[data.length-1-ob_period][Candlestick.CLOSE]) * 100;    // Calculate absolute percent move from potential OB to last candle of subsequent candles
		const relmove   = absmove >= threshold                                           // Identify "Relevant move" by comparing the absolute move to the threshold


		// Bullish Order Block Identification
		const bullishOB = data[data.length-1-ob_period][Candlestick.CLOSE] < data[data.length-1-ob_period][Candlestick.OPEN];                            // Determine potential Bullish OB candle (red candle)

		let upcandles  = 0;
		let downcandles: number = 0;
		for(let i = 1; i < periods; i++) {
			upcandles = upcandles + (data[data.length-1 - i][Candlestick.CLOSE] > data[data.length-1-i][Candlestick.OPEN] ? 1 : 0);                   // Determine color of subsequent candles (must all be green to identify a valid Bearish OB)
			downcandles = downcandles + (data[data.length-1 - i][Candlestick.CLOSE] < data[data.length-1-i][Candlestick.OPEN] ? 1 : 0);                   // Determine color of subsequent candles (must all be green to identify a valid Bearish OB)
		}

		const OB_bull      = bullishOB && (upcandles == (periods)) && relmove;          // Identification logic (red OB candle & subsequent green candles)
		const OB_bull_high = OB_bull ? usewicks ? data[data.length-1-ob_period][Candlestick.HIGH] : data[data.length-1-ob_period][Candlestick.OPEN] : undefined;   // Determine OB upper limit (Open or High depending on input)
		const OB_bull_low  = OB_bull ? data[data.length-1-ob_period][Candlestick.LOW] :  undefined;	// Determine OB lower limit (Low)
		let OB_bull_avg = undefined;
		if(OB_bull_low && OB_bull_high) {
			OB_bull_avg  = (OB_bull_low + OB_bull_high)/2;                              // Determine OB middle line
		} 

		// Bearish Order Block Identification
		const bearishOB = data[data.length-1-ob_period][Candlestick.CLOSE] > data[data.length-1-ob_period][Candlestick.OPEN]                             // Determine potential Bearish OB candle (green candle)

		const OB_bear      = bearishOB && (downcandles == (periods)) && relmove        // Identification logic (green OB candle & subsequent green candles)
		const OB_bear_high = OB_bear ? data[data.length-1-ob_period][Candlestick.HIGH] : undefined;                               // Determine OB upper limit (High)
		const OB_bear_low  = OB_bear ? usewicks ? data[data.length-1-ob_period][Candlestick.LOW] : data[data.length-1-ob_period][Candlestick.OPEN] : undefined;    // Determine OB lower limit (Open or Low depending on input)
		let OB_bear_avg = undefined;
		if(OB_bear_low && OB_bear_high) {
			OB_bear_avg  = (OB_bear_low + OB_bear_high)/2                              // Determine OB middle line
		}
	}
}