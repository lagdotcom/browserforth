export default interface Stack {
	clear(): void;
	contents: number[];
	p: number;
	pbottom: number;
	ptop: number;
	push(x: number): void;
	pushd(x: number): void;
	pushf(f: boolean): void;
	pop(): number;
	popd(): number;
	top(offset?: number): number;
	topd(offset?: number): number;
}
