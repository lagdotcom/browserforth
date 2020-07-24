export default interface Stack {
	clear(): void;
	contents: number[];
	push(x: number): void;
	p: number;
	pbottom: number;
	ptop: number;
	pushf(f: boolean): void;
	pop(): number;
	top(): number;
}
