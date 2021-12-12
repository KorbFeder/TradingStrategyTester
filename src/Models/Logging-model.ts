import mongoose, {Schema, Document} from "mongoose";
import { TradeDirection } from "../Consts/TradeDirection";
import { ITrade } from "./TestAccount-model";

export interface ILogging extends Document {
    _id: mongoose.Types.ObjectId;
    trades: ITrade;
    instance: number
}

const LoggingSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    trade: {type: Object, required: true},
    instance: {type: Number, required: true}
}, 
{
    timestamps: true
});

export default mongoose.model<ILogging>('Logging', LoggingSchema);