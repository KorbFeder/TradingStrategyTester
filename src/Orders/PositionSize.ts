import { LimitOrder } from "../Models/FuturePosition-interface";

export class PositionSize {
    static calculate(capital: number, entry: number, stopLosses: LimitOrder[]): number {
        let envRisk = process.env.RISK;
        let risk = 0.02;
        if(envRisk) {
            risk = parseFloat(envRisk);
        }
        const totalSize = stopLosses.map(stop => stop.amount).reduce((prev, curr) => prev + curr);
        let stopLoss: number = -1
        for(let stop of stopLosses) {
            stopLoss += (stop.amount / totalSize) * stop.price
        }

        if(risk > 1 || risk < 0) {
            throw "risk has to be between 1 and 0";
        }

        const riskAmount = capital * risk;
        let distance = stopLoss / entry - 1;

        if(entry > stopLoss) {
            distance = entry / stopLoss - 1;
        }

        return (riskAmount / distance) / entry;
    }
}