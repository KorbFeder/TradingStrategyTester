import mongoose, {Schema, Document} from "mongoose";

export interface IBalance extends Document {
    _id: mongoose.Types.ObjectId,
    usdt: number,
}

const BalanceSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    usdt: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<IBalance>('Balance', BalanceSchema);