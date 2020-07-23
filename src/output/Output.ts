export default interface Output {
	cols: number;
	rows: number;

	emit(ch: string): void;
	goto(x: number, y: number): void;
	type(str: string): void;
}
