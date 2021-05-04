import mongoose, {Schema, Document} from "mongoose";

export interface IStoppLossTarget extends Document {
    _id: mongoose.Types.ObjectId,
    symbol: string;
    amount: number;
    stop: number;
    target: number;
}

const StoppLossTargetSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    amount: {type: Number, required: true},
    symbol: {type: String, required: true},
    stop: {type: Number, required: true},
    target: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<IStoppLossTarget>('StoppLossTarget', StoppLossTargetSchema);