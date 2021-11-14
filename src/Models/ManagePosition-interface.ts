import { OHLCV } from "ccxt";
import { FuturePosition } from "./FuturePosition-interface";
import { ITrade } from "./TestAccount-model";

export enum ManagementType {
	NORMAL = 0, DYNAMIC = 1, NORMAL_INDIVIDUAL = 2, IGNORE_NEW_TRADES = 3, ENTRY_TESTING = 4
};

export interface ManagePosition {
	supportedManagementTypes: ManagementType[];
	manage(data: OHLCV, position: FuturePosition): Promise<ITrade | undefined>;
	reset(): void;
}