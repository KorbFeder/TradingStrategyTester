import mongoose, {Schema, Document} from "mongoose";

export interface ITestResults extends Document {
    _id: mongoose.Types.ObjectId,
    name: string,
    timeframe: string,
    winsLong: number,
    losesLong: number,
    winsShort: number,
    losesShort: number,
    winrate: number
}

const TestResultSchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    name: {type: String, required: true},
    timeframe: {type: String, required: true},
    winsLong: {type: Number, required: true},
    losesLong: {type: Number, required: true},
    winsShort: {type: Number, required: true},
    losesShort: {type: Number, required: true},
    winrate: {type: Number, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<ITestResults>('TestResults', TestResultSchema);