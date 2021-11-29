import { Exchange } from "ccxt";
import { Database } from "../Database/Database";
import { IBot } from "../Models/Bot-interface";
import readline from 'readline';
import { IAlert } from "../Models/Alert-model";
import { main } from "cli";

enum MenuState {
	MAIN = 0, ALERT = 1, TRADE = 2
}


export class Cli implements IBot {
	constructor(public exchange: Exchange, private db: Database) {}

	async start(): Promise<void> {
		let menuState = MenuState.MAIN;

		let getCommandCompletions: readline.Completer = (s) => {
			return [[], s];
		}

		const r1 = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			completer: (s: string) => getCommandCompletions(s),
		});

		this.printMenu(menuState);

		for await (const line of r1) {
			switch(menuState) {
				case MenuState.MAIN:
					menuState = this.mainMenuSelection(this.getSelection(line));
					this.printMenu(menuState);
					break;
				case MenuState.ALERT: 
					menuState = await this.alertMenuSelection(this.getSelection(line), line);
					this.printMenu(menuState);
					break;
				case MenuState.TRADE: 
					menuState = await this.tradeMenuSelection(this.getSelection(line));
					this.printMenu(menuState);
					break;
			}
		}
	}

	private mainMenuSelection(selection: number): MenuState {
		switch(selection) {
			case 0:
				return MenuState.MAIN;
			case 1:
				return MenuState.TRADE;
			case 2: 
				return MenuState.ALERT;
			default:
				return MenuState.MAIN;
		}
	}

	private async alertMenuSelection(selection: number, restInfo: string) {
		switch(selection) {
			case 0:
				return MenuState.MAIN
			case 1:
				const alerts: IAlert[] = await this.db.loadAlerts();
				for(let i = 0; i < alerts.length; i++) {
					console.log('id: ', i, 'on symbol: ', alerts[i].symbol, ' at price level: ', alerts[i].price);
				}
				return MenuState.ALERT;
			case 2:	
				const args: string[] = this.retrieveArguments(restInfo);
				if(args.length == 2) {
					const symbol = args[0];
					const price = parseInt(args[1]);
					if(price) {
						const res = await this.db.saveAlert(symbol, price);
						console.log('saved alert');
					} else {
						console.log('failed to set alert, price has to be a number');
					}
				} else {
					console.log('failed to set alert, there were no 2 arguments specified')
				}
				return MenuState.ALERT;
			case 3:
				const _alerts: IAlert[] = await this.db.loadAlerts();
				const _args: string[] = await this.retrieveArguments(restInfo);
				const id = parseInt(_args[0]);
				if(id) {
					await this.db.removeAlert(_alerts[id]._id);
					console.log('alert deleted');
				} else {
					console.log('could not delete alert, id needs to be a number');
				}
				return MenuState.ALERT;
			default:
				return MenuState.ALERT;
		}
	}

	private async tradeMenuSelection(selection: number): Promise<MenuState> {
		switch(selection) {
			case 0: 
				return MenuState.MAIN;
			default:
				return MenuState.MAIN;
		}
	}

	private getSelection(line: string): number {
		const selector = parseInt(line[0]);
		if(selector) {
			return selector;
		}
		return 0;
	}

	private retrieveArguments(line: string): string[] {
		const args: string[] = line.split(' ');
		args.shift();
		return args;
	}

	private printMenu(nextMenuState: MenuState) {
		const mainMenu = `
Main Menu: 
choose an option by typing one of the numbers: 
0 Main Menu
1 Trading
2 Alert`;

		const tradingMenu = `
Trade Menu:
0 Main Menu
...`;
		
		const alertMenu = `
Alert Menu:
0 Main Menu
1 Show active Alerts
2 Set Alert: 2 <symbol> <price>
Example: 2 BTC-PERP 51274
3 Remove Alert: 3 <Id>
Example: 3 0`;


		switch(nextMenuState) {
			case MenuState.MAIN: 
				console.log(mainMenu)
				break;
			case MenuState.ALERT:
				console.log(alertMenu);
				break;
			case MenuState.TRADE: 
				console.log(tradingMenu);
				break;
			default: 
				console.log(mainMenu);
				break;
		}
	}
}