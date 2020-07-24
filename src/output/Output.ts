export default interface Output {
	cols: number;
	rows: number;

	cr(): void;
	emit(ch: string): void;
	goto(x: number, y: number): void;
	type(str: string): void;
}
