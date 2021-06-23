import { OHLCV } from "ccxt";
import { Renko } from "../Technicals/Renko";
import fs from 'fs';
import { Candlestick } from "../Consts/Candlestick";

export function saveDataASFile(data: OHLCV[]) {
	const renko = Renko.traditional(data, data[data.length-1][Candlestick.CLOSE]);
	const formatedRenko = renko.map((r) => {return {date: 0, open: r.low, high: r.high, low: r.low, close: r.low, volume: 0}});
	fs.writeFile('data.txt', JSON.stringify(formatedRenko), (err) => {
		console.log(err);
	});	
}