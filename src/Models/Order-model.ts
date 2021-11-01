import mongoose, {Schema, Document} from "mongoose";
import { LimitOrder } from "./FuturePosition-interface";

export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId,
    symbol: string;
    buyPrice: number;
    orderType: string;
    amount: number;
    stops: LimitOrder[];
    targets: LimitOrder[];
    instance: number;
}

const OrderSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    amount: {type: Number, required: true},
    buyPrice: {type: Number, required: true},
    symbol: {type: String, required: true},
    orderType: {type: String, required: true},
    stops: {type: Array, required: true},
    targets: {type: Array, required: true},
    instance: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<IOrder>('Order', OrderSchema);