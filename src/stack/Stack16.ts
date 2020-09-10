import Stack from './Stack';

export default class Stack16 implements Stack {
	mem: DataView;
	p: number;
	pbottom: number;
	ptop: number;
	size: number;

	constructor(mem: DataView, sp0: number, size: number) {
		this.mem = mem;
		this.p = sp0;
		this.pbottom = sp0 - size;
		this.ptop = sp0;
		this.size = size;
	}

	get contents() {
		const stack = [];
		var addr = this.p;
		while (addr < this.ptop) {
			stack.unshift(this.mem.getUint16(addr));
			addr += 2;
		}

		return stack;
	}

	clear() {
		this.p = this.ptop;
	}

	push(x: number) {
		this.p -= 2;
		return this.mem.setUint16(this.p, x);
	}

	pushf(f: boolean) {
		this.push(f ? -1 : 0);
	}

	pop() {
		if (this.p >= this.ptop) throw new Error('Stack underflow');

		const res = this.mem.getUint16(this.p);
		this.p += 2;
		return res;
	}

	top() {
		if (this.p >= this.ptop) throw new Error('Stack underflow');

		return this.mem.getUint16(this.p);
	}
}