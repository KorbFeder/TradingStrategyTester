import { OHLCV } from "ccxt";
import { FuturePosition } from "./FuturePosition-interface";
import { ITrade } from "./TestAccount-model";

export interface ManagePosition {
	manage(confirmationData: OHLCV[], position: FuturePosition): Promise<ITrade | undefined>;
}