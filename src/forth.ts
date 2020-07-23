import { ForthBuiltins } from './builtins';
import Output from './output/Output';
import NullOutput from './output/NullOutput';

const ForthVersion = '0.1.0';

interface ForthOptions {
	cellsize: number;
	debug: boolean;
	memory: number;
	output: Output;
}

type ForthBuiltin = (f: Forth) => void;

export enum HeaderFlags {
	LengthMask = 0x00ff,
	IsWord = 0x0f00,
	IsBuiltin = 0x1000,
	IsVariable = 0x2000,
	IsConstant = 0x4000,
	IsImmediate = 0x8000,
}

export default class Forth {
	private buffer: ArrayBuffer;
	private builtins: ForthBuiltin[];
	fetch: (addr: number) => number;
	private here: number;
	private link: number;
	mem: DataView;
	options: ForthOptions;
	pop: () => number;
	push: (x: number) => void;
	private sp: number;
	private sp0: number;
	store: (addr: number, x: number) => number;

	constructor(options: Partial<ForthOptions> = {}) {
		this.options = {
			cellsize: options.cellsize || 2,
			memory: options.memory || 65536,
			output: options.output || new NullOutput(),
			debug: typeof options.debug !== 'undefined' ? options.debug : false,
		};

		this.buffer = new ArrayBuffer(this.options.memory);
		this.builtins = [];
		this.mem = new DataView(this.buffer);
		this.here = 0;
		this.link = 0;
		this.sp0 = this.options.memory;
		this.sp = this.sp0;

		if (this.options.cellsize == 2) {
			this.fetch = this.fetch16;
			this.push = this.push16;
			this.pop = this.pop16;
			this.store = this.store16;
		} else if (this.options.cellsize == 4) {
			this.fetch = this.fetch32;
			this.push = this.push32;
			this.pop = this.pop32;
			this.store = this.store32;
		} else throw new Error('Invalid cell size');

		this.options.output.type(`browserforth v${ForthVersion} starting...`);

		ForthBuiltins.attach(this);
	}

	get stack() {
		const stack = [];
		var addr = this.sp;
		while (addr < this.sp0) {
			stack.unshift(this.fetch(addr));
			addr += this.options.cellsize;
		}

		return stack;
	}

	debug(...params: any[]) {
		if (this.options.debug) console.log(...params);
	}

	execute(xt: number) {
		const winfo = this.wordinfo(xt - this.options.cellsize);
		const data = this.fetch(winfo.cfa);

		if (!(winfo.flags & HeaderFlags.IsWord)) {
			throw new Error(`trying to execute non-word: ${xt}`);
		}

		this.debug('execute:', winfo.name);

		if (winfo.flags & HeaderFlags.IsBuiltin) {
			this.builtins[data](this);
		} else if (winfo.flags & HeaderFlags.IsConstant) {
			this.push(data);
		} else if (winfo.flags & HeaderFlags.IsVariable) {
			this.push(data);
		} else {
			// TODO
			throw new Error(`dunno how to execute ${xt} yet`);
		}
	}

	words() {
		const wordlist: { [name: string]: number } = {};

		var link = this.link;
		while (link) {
			const winfo = this.wordinfo(link);
			wordlist[winfo.name] = winfo.xt;

			link = winfo.link;
		}

		return wordlist;
	}

	wordinfo(addr: number) {
		const { cellsize } = this.options;

		const link = this.fetch(addr);
		const xt = addr + cellsize;

		const lenflags = this.fetch(xt);
		const len = lenflags & HeaderFlags.LengthMask;
		const flags = lenflags - len;
		const name = this.readString(xt + cellsize, len);
		const cfa = xt + cellsize + (lenflags & HeaderFlags.LengthMask);

		return { link, xt, len, flags, name, cfa };
	}

	addBuiltin(name: string, b: ForthBuiltin) {
		const bid = this.builtins.length;
		this.debug('builtin:', name, bid);

		this.header(name, HeaderFlags.IsBuiltin);
		// TODO: this isn't technically needed; could use the builtin's name as a lookup!
		this.write(bid);
		this.builtins.push(b);
	}

	addConstant(name: string, value: number) {
		this.debug('constant:', name, value);

		this.header(name, HeaderFlags.IsConstant);
		this.write(value);
	}

	addVariable(name: string, initial: number = 0) {
		this.debug('variable:', name, initial);

		const org = this.here;
		this.write(initial);
		this.header(name, HeaderFlags.IsVariable);
		this.write(org);
	}

	readString(addr: number, len: number) {
		const slice = this.buffer.slice(addr, addr + len);
		return Buffer.from(slice).toString();
	}

	writeString(str: string, override?: number) {
		this.write(typeof override === 'undefined' ? str.length : override);
		for (var i = 0; i < str.length; i++) this.write8(str.charCodeAt(i));
	}

	header(name: string, flags: HeaderFlags) {
		const org = this.here;
		this.write(this.link);
		this.link = org;
		this.writeString(name, flags | HeaderFlags.IsWord | name.length);
	}

	write(x: number) {
		this.here = this.store(this.here, x);
	}

	write8(x: number) {
		this.mem.setUint8(this.here, x);
		this.here++;
	}

	fetch16(addr: number) {
		return this.mem.getUint16(addr);
	}

	push16(x: number) {
		this.sp -= 2;
		return this.mem.setUint16(this.sp, x);
	}

	pop16() {
		if (this.sp >= this.sp0) throw new Error('Stack underflow');

		const res = this.mem.getUint16(this.sp);
		this.sp += 2;
		return res;
	}

	store16(addr: number, x: number) {
		this.mem.setUint16(addr, x);
		return addr + 2;
	}

	fetch32(addr: number) {
		return this.mem.getUint32(addr);
	}

	push32(x: number) {
		this.sp -= 4;
		return this.mem.setUint32(this.sp, x);
	}

	pop32() {
		if (this.sp >= this.sp0) throw new Error('Stack underflow');

		const res = this.mem.getUint32(this.sp);
		this.sp += 4;
		return res;
	}

	store32(addr: number, x: number) {
		this.mem.setUint32(addr, x);
		return addr + 4;
	}
}
