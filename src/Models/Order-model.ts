import mongoose, {Schema, Document} from "mongoose";

export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId,
    symbol: string;
    buyPrice: number;
    orderType: string;
    amount: number;
    stop: number;
    target: number;
    instance: number;
}

const OrderSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    amount: {type: Number, required: true},
    buyPrice: {type: Number, required: true},
    symbol: {type: String, required: true},
    orderType: {type: String, required: true},
    stop: {type: Number, required: true},
    target: {type: Number, required: true},
    instance: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<IOrder>('Order', OrderSchema);