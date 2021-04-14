import Output from './Output';

export default class StdoutOutput implements Output {
	cols: number;
	rows: number;

	constructor() {
		this.cols = process.stdout.columns;
		this.rows = process.stdout.rows;
	}

	cr() {
		process.stdout.write('\n');
	}
	emit(ch: string) {
		process.stdout.write(ch);
	}
	goto(x: number, y: number) {
		process.stdout.cursorTo(x, y);
	}
	type(str: string) {
		process.stdout.write(str);
	}
}
