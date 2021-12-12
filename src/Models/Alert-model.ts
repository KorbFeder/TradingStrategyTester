import mongoose, {Schema, Document} from "mongoose";
import { TradeDirection } from "../Consts/TradeDirection";

export interface IAlert extends Document {
    _id: mongoose.Types.ObjectId,
    price: number,
    symbol: string,
    instance: number
}

const AlertSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    price: {type: Number, required: true},
    symbol: {type: String, required: true},
	instance: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<IAlert>('Alert', AlertSchema);