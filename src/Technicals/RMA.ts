import { SMA } from "technicalindicators";
import { MAInput } from "technicalindicators/declarations/moving_averages/SMA";

export class RMA {
	static calculate(data: number[], length: number): number[] {
		const alpha: number = 1 / length; 

		const smaInput: MAInput = {
			period: length, 
			values: data.map((d) => d)
		}
		const sma = SMA.calculate(smaInput);
		const sum: number[] = [sma[sma.length-1]];

		for(let i = length - 1; i < data.length; i++) {
			sum.push(alpha * data[i] + (1 - alpha) * sum[sum.length-1]);
		}
		return sum;
	}
}