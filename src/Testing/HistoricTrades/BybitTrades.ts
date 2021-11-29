import { Trade } from 'ccxt';
import request from 'request';
import { HistoricTradesFetcher } from '../../Models/HistoricTradesFetcher-interface';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import {createUnzip} from 'zlib';

const parsePromise = function(file: fs.ReadStream) {
  return new Promise(function(complete, error) {
    Papa.parse(file, {complete, error, header: true});
  });
};

export interface BybitTradesModel {
	timestap: string;
	symbol: string;
	side: string;
	size: string; 
	price: string;
	tickDirection: string;
	trdMatchId: string;
	grossValue: string;
	homeNotional: string;
	foreignNotional: string;
}

const BYBIT_URL = 'https://public.bybit.com/trading/'

export class BybitTrades implements HistoricTradesFetcher {
	name: string = 'ByBit';
	constructor() {}

	public async getData(symbol: string, currDate: Date): Promise<Trade[]> {
		symbol = symbol.replace('/', '');
		const name = symbol
			+ currDate.getUTCFullYear() + '-' 
			+ ('0' +  currDate.getUTCMonth()).slice(-2) + '-' 
			+ ('0' + currDate.getUTCDate()).slice(-2) + '.csv';
		const url = BYBIT_URL + symbol + '/' + name + '.gz';
		return this.transformData(await this.downloadData(url, name));
	}

	private async downloadData(url: string, name: string): Promise<BybitTradesModel[]> {
		const filePath = path.join(__dirname, '../../..', '/csvs/bybit/', name);
		if(!fs.existsSync(filePath)) {
			// if file doesn't exit download it from the internet
			const file = fs.createWriteStream(filePath);
			await new Promise<void>((resolve, reject) => {
				request(url)
					.pipe(createUnzip())
					.pipe(file)
					.on('error', (err: any) => reject(err))
					.on('finish', () => {
						resolve();
					});
				}
			);
		}

		// open csv file and read the content
		const result: Papa.ParseResult<BybitTradesModel> = await parsePromise(fs.createReadStream(filePath)) as Papa.ParseResult<BybitTradesModel>;
		return result.data;
	}
	
	private transformData(byBitTrades: BybitTradesModel[]): Trade[] {
		return byBitTrades.map((trade) => {
			if(trade.side == 'Buy') {
				trade.side = 'buy';
			} else {
				trade.side = 'sell';
			}
			return {
				amount: parseFloat(trade.size),
				datetime: trade.timestap,
				id: trade.trdMatchId,
				info: {},
				price: parseFloat(trade.price),
				timestamp: parseInt(trade.timestap),
				side: trade.side as "buy" | "sell",
				symbol: trade.symbol,
				takerOrMaker: 'maker',
				cost: parseFloat(trade.size) * parseFloat(trade.price),
				fee: {
					type: 'maker',
					currency: 'USD',
					rate: 0,
					cost: 0,
				}
			}
		})
	}
}