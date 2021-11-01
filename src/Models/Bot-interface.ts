import { Exchange } from "ccxt";

export interface IBot {
	exchange: Exchange;

	start(): Promise<void>;
}