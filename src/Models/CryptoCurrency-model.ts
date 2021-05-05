import mongoose, {Schema, Document} from "mongoose";

export interface ICryptoCurrency extends Document {
    _id: mongoose.Types.ObjectId,
    free: number,
    used: number,
    currencyCode: string,
}

const CryptoCurrencySchema: Schema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    free: {type: Number, required: true},
    used: {type: Number, required: true},
    currencyCode: {type: String, required: true},
}, 
{
    timestamps: true
});

export default mongoose.model<ICryptoCurrency>('CryptoCurrency', CryptoCurrencySchema);