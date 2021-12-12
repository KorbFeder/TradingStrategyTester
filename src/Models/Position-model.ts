import mongoose, {Schema, Document} from "mongoose";
import { TradeDirection } from "../Consts/TradeDirection";
import { FuturePosition, LimitOrder } from "./FuturePosition-interface";

export interface IPosition extends Document {
    _id: mongoose.Types.ObjectId,
    position: FuturePosition;
    instance: number;
}

const PositionSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    position: {type: Object, required: true},
    instance: {type: Number, required: true}
}, 
{
    timestamps: true
});

export default mongoose.model<IPosition>('Position', PositionSchema);