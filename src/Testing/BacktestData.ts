export interface CryptoTimestamp {
    symbol: string;
    startTimestamp: Date;
    endTimestamp: Date;
}

export const backTestData: CryptoTimestamp[] = [
	{
		symbol: 'BTC-PERP', 
		startTimestamp: new Date(2021, 8, 1, 0, 0, 0, 0), 
		//startTimestamp: new Date(2021, 5, 15, 0, 0, 0, 0), 
		//endTimestamp: new Date(2021, 5, 27, 0, 0, 0)
		endTimestamp: new Date(2021, 9, 4, 0, 0, 0)
	},
	//{
	//	symbol: 'ETH-PERP', 
	//	startTimestamp: new Date(2020, 3, 1, 0, 0, 0, 0), 
	//	endTimestamp: new Date(2021, 4, 1, 0, 0, 0)
	//},
	//{
	//	symbol: 'SOL-PERP', 
	//	startTimestamp: new Date(2020, 7, 1, 0, 0, 0, 0), 
	//	endTimestamp: new Date(2021, 4, 1, 0, 0, 0)
	//},
	//{
	//	symbol: 'ADA-PERP', 
	//	startTimestamp: new Date(2020, 10, 1, 0, 0, 0, 0), 
	//	endTimestamp: new Date(2021, 4, 1, 0, 0, 0)
	//},
	//{
	//	symbol: 'DOGE-PERP', 
	//	startTimestamp: new Date(2020, 10, 1, 0, 0, 0, 0), 
	//	endTimestamp: new Date(2021, 4, 1, 0, 0, 0)
	//},
	//{
	//	symbol: 'BCH-PERP', 
	//	startTimestamp: new Date(2020, 6, 1, 0, 0, 0, 0), 
	//	endTimestamp: new Date(2021, 4, 1, 0, 0, 0)
	//},
	//{
	//	symbol: 'SUSHI-PERP', 
	//	startTimestamp: new Date(2020, 8, 1, 0, 0, 0, 0), 
	//	endTimestamp: new Date(2021, 4, 1, 0, 0, 0)
	//},
	//{
	//	symbol: 'LTC-PERP', 
	//	startTimestamp: new Date(2019, 6, 1, 0, 0, 0, 0), 
	//	endTimestamp: new Date(2021, 4, 1, 0, 0, 0)
	//},
];

