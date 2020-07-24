export default interface Stack {
	contents: number[];
	push(x: number): void;
	ptop: number;
	pushf(f: boolean): void;
	pop(): number;
	top(): number;
}
