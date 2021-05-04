import mongoose, {Schema, Document} from "mongoose";
import { TradeDirection } from "../Consts/TradeDirection";

export interface ILogging extends Document {
    _id: mongoose.Types.ObjectId,
    usdt: number,
    symbol: string,
    amount: number,
    tradeDrection: TradeDirection
}

const LoggingSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    usdt: {type: Number, required: true},
    symbol: {type: String, required: true},
    amount: {type: Number, required: true},
    tradeDirection: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<ILogging>('Logging', LoggingSchema);