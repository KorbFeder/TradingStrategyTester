import mongoose, {Schema, Document} from "mongoose";

export interface ICryptoCurrency extends Document {
    _id: mongoose.Types.ObjectId,
    amount: number,
    symbol: string,
    active: boolean
}

const CryptoCurrencySchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    amount: {type: Number, required: true},
    symbol: {type: String, required: true},
    active: {type: Boolean, require: true}
}, 
{
    timestamps: true
});

export default mongoose.model<ICryptoCurrency>('CryptoCurrency', CryptoCurrencySchema);