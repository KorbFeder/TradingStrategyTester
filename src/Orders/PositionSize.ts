export class PositionSize {
    static calculate(risk: number, capital: number, entry: number, stopLoss: number) {
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