import { OHLCV } from "ccxt";
import { Candlestick } from "../../Consts/Candlestick";
import { MarketStructure } from "../../Consts/MarketStructure";
import { MarketStructFinder } from "../../Models/MarketStructFinder-interface";
import { std } from 'mathjs';




const SMALLEST_SAMPLE = 4;

interface Subsample {
	observation: number;
	samples: number[][];
}

interface SingleSample {
	observation: number;
	sample: number;
}


export class HurstExponent implements MarketStructFinder {
	private midPoint = 0.5;
	private topLevel = 0.6;
	private bottomLevel = 0.4;

	constructor() {}

	private createSubsamples(data: OHLCV[]): number[] {
		const observation: number[] = [];
		const exponent = Math.floor((Math.log2(data.length)));
		// data should be 2^x + 1 size
		for(let i = exponent - 1; i >= Math.log2(SMALLEST_SAMPLE); i--) {
			observation.push(Math.pow(2, i));
		}
		return observation;
	}

	private priceReturns(data: OHLCV[]): number[] {
		const returns: number[] = [];
		for(let i = 1; i < data.length; i++) {
			returns.push(data[i][Candlestick.CLOSE] / data[i-1][Candlestick.CLOSE] - 1);
		}
		return returns;
	}
	
	// cuts off the first view datapoints to fit sample size better
	private cutData(data: OHLCV[], observation: number[]): OHLCV[] {
		return data.slice(data.length - (2*observation[0]) - 1, data.length);
	}

	private createSubSamples(returns: number[], observations: number[]): Subsample[] {
		const subsamples: Subsample[] = [];
		for(const observation of observations) {
			const subsample: Subsample = {samples: Array<Array<number>>(), observation};
			for(let i = 0; i < returns.length; i += observation) {
				subsample.samples.push(returns.slice(i, i + observation));
			}
			subsamples.push(subsample);
		}
		return subsamples;
	}

	private calcMean(samples: number[]): number {
		return samples.reduce((a, b) => a + b, 0) / samples.length;

	}

	private calcSubsampleMean(subsamples: Subsample[]): Subsample[] {
		const subsampleMeans: Subsample[] = [];
		for(const subsample of subsamples) {
			const subsampleMean: Subsample = {observation: subsample.observation, samples: Array<Array<number>>()};
			subsampleMean.samples = subsample.samples.map(sample => [this.calcMean(sample)]);
			subsampleMeans.push(subsampleMean);
		}
		return subsampleMeans;
	}

	private calcDeviate(samples: number[], mean: number): number[] {
		const results: number[] = [];
		for(let sample of samples) {
			results.push(sample - mean);
		}
		return results;
	}

	private calcDemeanedReturn(subsamples: Subsample[], subsampleMeans: Subsample[]) {
		const demeanedReturns: Subsample[] = [];
		for(let i = 0; i < subsamples.length; i++) {
			const demeanReturn: Subsample = {observation: subsamples[i].observation, samples: Array<Array<number>>()};
			for(let u = 0; u < subsamples[i].samples.length; u++) {
				demeanReturn.samples.push(this.calcDeviate(subsamples[i].samples[u], subsampleMeans[i].samples[u][0]));
			}
			demeanedReturns.push(demeanReturn);
		}
		return demeanedReturns;
	}

	private calcCumDev(deviations: number[]) {
		const result: number[] = [];
		for(let i = 0; i < deviations.length; i++) {
			let sum = 0; 
			for(let u = i; u >= 0; u--) {
				sum += deviations[u];
			}
			result.push(sum);
		}
		return result;
	}

	private cumulativeDeviate(demeanedReturns: Subsample[]): Subsample[] {
		const cumDevs: Subsample[] = [];
		for(let demeanReturn of demeanedReturns) {
			const cumDev: Subsample = {observation: demeanReturn.observation, samples: Array<Array<number>>()};
			for(let sample of demeanReturn.samples) {
				cumDev.samples.push(this.calcCumDev(sample));
			}
			cumDevs.push(cumDev);
		}
		return cumDevs;
	}

	private cumDevRange(cumDev: number[]): number {
		return Math.max(...cumDev) - Math.min(...cumDev);
	}

	private subsampleRange(cumDevSubsamples: Subsample[]): Subsample[] {
		const result: Subsample[] = [];
		for(const cumDevSubsample of cumDevSubsamples) {
			const cumDev = {observation: cumDevSubsample.observation, samples: Array<Array<number>>()};
			for(const sample of cumDevSubsample.samples) {
				cumDev.samples.push([this.cumDevRange(sample)]);
			}
			result.push(cumDev);
		}
		return result;
	}

	private calcStdDev(subsamples: Subsample[]): Subsample[] {
		const result: Subsample[] = [];
		for(let subsample of subsamples) {
			const sub = {observation: subsample.observation, samples: Array<Array<number>>()};
			for(let sample of subsample.samples) {
				sub.samples.push([std(sample)]);
			}
			result.push(sub);
		}
		return result;
	}


	private calcualteRS(range: Subsample[], stdDev: Subsample[]): Subsample[] {
		const result: Subsample[] = [];
		for(let i = 0; i < range.length; i++) {
			const sub = {observation: range[i].observation, samples: Array<Array<number>>()};
			for(let u = 0; u < range[i].samples.length; u++) {
				sub.samples.push([range[i].samples[u][0] / stdDev[i].samples[u][0]]);
			}
			result.push(sub);
		}
		return result;
	}

	private calcAvgRs(rs: Subsample[]): SingleSample[] {
		const result: SingleSample[] = [];
		for(let rs_elem of rs) {
			result.push({observation: rs_elem.observation, sample: this.calcMean(rs_elem.samples.map((x) => x[0]))});
		}
		return result;
	}

	private regress(x: number[], y: number[]) {
		const n = y.length;
		let sx = 0;
		let sy = 0;
		let sxy = 0;
		let sxx = 0;
		let syy = 0;
		for (let i = 0; i < n; i++) {
			sx += x[i];
			sy += y[i];
			sxy += x[i] * y[i];
			sxx += x[i] * x[i];
			syy += y[i] * y[i];
		}
		const mx = sx / n;
		const my = sy / n;
		const yy = n * syy - sy * sy;
		const xx = n * sxx - sx * sx;
		const xy = n * sxy - sx * sy;
		const slope = xy / xx;
		const intercept = my - slope * mx;
		const r = xy / Math.sqrt(xx * yy);
		const r2 = Math.pow(r,2);
		let sst = 0;
		for (let i = 0; i < n; i++) {
		   sst += Math.pow((y[i] - my), 2);
		}
		const sse = sst - r2 * sst;
		const see = Math.sqrt(sse / (n - 2));
		const ssr = sst - sse;
		return {slope, intercept, r, r2, sse, ssr, sst, sy, sx, see};
	}

	// http://bearcave.com/misl/misl_tech/wavelets/hurst/index.html
	// E[R(n)/S(n)]
	// R(n) is the range of the first n cumulative deviations from the mean
	// S(n) is the series (sum) of the first n standard deviations
	// E[x] is the expected value 
	public calculate(data: OHLCV[]): MarketStructure {
		const observations = this.createSubsamples(data);
		data = this.cutData(data, observations);
		const returns = this.priceReturns(data);
		const subsamples: Subsample[] = this.createSubSamples(returns, observations);
		const subsampleMeans: Subsample[] = this.calcSubsampleMean(subsamples);
		const demeanedReturns: Subsample[] = this.calcDemeanedReturn(subsamples, subsampleMeans);
		const cumDevs: Subsample[] = this.cumulativeDeviate(demeanedReturns);
		const range: Subsample[] = this.subsampleRange(cumDevs);
		const stdDev: Subsample[] = this.calcStdDev(subsamples);
		const rs = this.calcualteRS(range, stdDev);
		const avgRs: SingleSample[] = this.calcAvgRs(rs);
		const logRs: SingleSample[] = avgRs.map((avg) => {return {observation: avg.observation, sample: Math.log(avg.sample)}});
		const logn: SingleSample[] = observations.map((obs) => {return {observation: obs, sample: Math.log(obs)}});

		// maybe use standard error of a slope to get a better estimate

		const { slope: hurst } = this.regress(logn.map(n => n.sample), logRs.map(rs => rs.sample));
		if(hurst > 0.6) {
			return MarketStructure.UPTREND;
		} else if(hurst < 0.6 && hurst > 0.4) {
			return MarketStructure.CONSOLIDATING;
		} else if(hurst < 0.4) {
			return MarketStructure.RANGING;
		}
		return MarketStructure.CONSOLIDATING;
	}
}