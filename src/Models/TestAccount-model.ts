import mongoose, {Schema, Document} from "mongoose";
import { TradeDirection } from "../Consts/TradeDirection";
import { LimitOrder } from "./FuturePosition-interface";

export interface ITestAccount extends Document {
    _id: mongoose.Types.ObjectId,
	name: string,
    trades: ITrade[],
	percentageGain: number[],
	balance: number,
	pnl: number,
	instance: number
}

export interface ITrade {
	tradeDirection: TradeDirection,
	initialSize: number,
	win: boolean,
	symbol: string
	date: Date,
	firstEntry: number,
	breakEvenPrice: number,
	lastSize: number,
	exitPrice: number,
}

const TestAcccountSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
	name: {type: String, reqluired: true},
	instance: {type: Number, required: true},
	percentageGain: {type: Array, default: [], require: true},
    trades: {type: Array, default: [], required: true},
    balance: {type: Number, required: true},
    pnl: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<ITestAccount>('TestAccount', TestAcccountSchema);