import Stack from './Stack';

const cell = 4;
export default class Stack32 implements Stack {
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
			stack.unshift(this.mem.getUint32(addr));
			addr += cell;
		}

		return stack;
	}

	clear() {
		this.p = this.ptop;
	}

	push(x: number) {
		this.p -= cell;
		return this.mem.setUint32(this.p, x);
	}

	pushd(x: number) {
		this.p -= cell * 2;
		return this.mem.setBigUint64(this.p, BigInt(x));
	}

	pushf(f: boolean) {
		this.push(f ? -1 : 0);
	}

	pop() {
		if (this.p >= this.ptop) throw new Error('Stack underflow');

		const res = this.mem.getUint32(this.p);
		this.p += cell;
		return res;
	}

	popd() {
		if (this.p >= this.ptop - cell) throw new Error('Stack underflow');

		const res = this.mem.getBigUint64(this.p);
		this.p += cell * 2;
		return Number(res);
	}

	top(offset: number = 0) {
		if (this.p >= this.ptop) throw new Error('Stack underflow');

		return this.mem.getUint32(this.p + offset * cell);
	}

	topd(offset: number = 0) {
		if (this.p >= this.ptop - cell) throw new Error('Stack underflow');

		return Number(this.mem.getBigUint64(this.p + offset * cell * 2));
	}
}
