import mongoose, {Schema, Document} from "mongoose";
import { WalkForwardResult } from "./WalkForwardResult-interface";

export interface ICurrWfaResult extends Document {
    _id: mongoose.Types.ObjectId,
	currWfaResult: WalkForwardResult,
	instance: number
}

const CurrWfaResultSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
	currWfaResult: {type: Object, default: [], require: true},
	instance: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<ICurrWfaResult>('CurrWfaResult', CurrWfaResultSchema);