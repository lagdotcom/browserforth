import Stack from './Stack';

export default class Stack32 implements Stack {
	mem: DataView;
	p: number;
	p0: number;
	ptop: number;
	size: number;

	constructor(mem: DataView, sp0: number, size: number) {
		this.mem = mem;
		this.p = sp0;
		this.p0 = sp0;
		this.ptop = sp0 - size;
		this.size = size;
	}

	get contents() {
		const stack = [];
		var addr = this.p;
		while (addr < this.p0) {
			stack.unshift(this.mem.getUint32(addr));
			addr += 4;
		}

		return stack;
	}

	push(x: number) {
		this.p -= 4;
		return this.mem.setUint32(this.p, x);
	}

	pushf(f: boolean) {
		this.push(f ? -1 : 0);
	}

	pop() {
		if (this.p >= this.p0) throw new Error('Stack underflow');

		const res = this.mem.getUint32(this.p);
		this.p += 4;
		return res;
	}

	top() {
		if (this.p >= this.p0) throw new Error('Stack underflow');

		return this.mem.getUint32(this.p);
	}
}
