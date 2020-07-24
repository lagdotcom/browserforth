import Output from './Output';

export default class NullOutput implements Output {
	cols: number;
	rows: number;

	constructor() {
		this.cols = 80;
		this.rows = 25;
	}

	cr() {}
	emit(ch: string) {}
	goto(x: number, y: number) {}
	type(str: string) {}
}
