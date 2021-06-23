import express from "express";
import { Database } from "../Database";

const PORT = 8000;
const app = express();

export function startServer(db: Database) {
	app.use(express.json());
	app.get('/', async (req, res) => {
		const cryptos = await db.loadCryptos();
		const logs = await db.loadLoggedTrades();
		const orders = await db.loadOrder();
		let result: string = '<h1> cryptos: </h1>';
		for(let crypto of cryptos) {
			result += '<p>' + JSON.stringify(crypto) + '</p>';
		}
		result += '<h1> logs: </h1>';
		for(let log of logs) {
			result += '<p>' + JSON.stringify(log) + '</p>';
		}
		result += '<h1> order </h1>'; 
		for(let order of orders) {
			result += '<p>' + JSON.stringify(order) + '</p>';
		}

		res.send(result);
	});

	app.listen(PORT, () => {
		console.log('server started');
	});
}
