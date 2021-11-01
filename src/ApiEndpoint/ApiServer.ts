import { Exchange } from "ccxt";
import express from "express";
import { Request, Response } from "express-serve-static-core";
import { Timeframe } from "../Consts/Timeframe";
import { Server } from "node:http";

export class ApiServer {
	private app = express();
	private server: Server | undefined = undefined;

	constructor(
		private exchange: Exchange,
	) {
		this.app.use(express.json());
		this.app.use(express.urlencoded({
			extended: true
		}));

		this.server = this.app.listen(8080, function () {
			console.log('server started');
		});
	}

	async startServer() {
		this.app.get('/api/ohclv', await this.getData);
	}

	private async getData(req: Request, res: Response) {
		const symbol: string = req.body.symbol ? req.body.symbol : 'BTC-PERP';
		const timeframe: string = req.body.timeframe ? req.body.timeframe : Timeframe.h4;
		const data = await this.exchange.fetchOHLCV(symbol, timeframe);
		res.send(data);
	}
}