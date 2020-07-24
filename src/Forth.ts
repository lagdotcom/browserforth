import ForthBuiltins from './ForthBuiltins';
import ForthException from './ForthException';
import Input from './input/Input';
import NullInput from './input/NullInput';
import NullOutput from './output/NullOutput';
import Output from './output/Output';
import Stack from './stack/Stack';
import Stack16 from './stack/Stack16';
import Stack32 from './stack/Stack32';

const ForthVersion = '0.1.1';

interface ForthOptions {
	cellsize: number;
	debug: boolean;
	input: Input;
	memory: number;
	output: Output;
	rstacksize: number;
	stacksize: number;
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
	rstack: Stack;
	signed: (x: number) => number;
	stack: Stack;
	store: (addr: number, x: number) => number;

	constructor(options: Partial<ForthOptions> = {}) {
		this.options = {
			cellsize: options.cellsize || 2,
			debug: typeof options.debug !== 'undefined' ? options.debug : false,
			input: options.input || new NullInput(),
			memory: options.memory || 60000,
			output: options.output || new NullOutput(),
			rstacksize: options.rstacksize || 64,
			stacksize: options.stacksize || 64,
		};

		this.buffer = new ArrayBuffer(this.options.memory);
		this.builtins = [];
		this.mem = new DataView(this.buffer);
		this.here = 0;
		this.link = 0;

		if (this.options.cellsize == 2) {
			this.stack = new Stack16(
				this.mem,
				this.options.memory,
				this.options.stacksize
			);
			this.rstack = new Stack16(
				this.mem,
				this.options.memory - this.options.stacksize,
				this.options.rstacksize
			);

			this.fetch = this.fetch16;
			this.signed = this.signed16;
			this.store = this.store16;
		} else if (this.options.cellsize == 4) {
			this.stack = new Stack32(
				this.mem,
				this.options.memory,
				this.options.stacksize
			);
			this.rstack = new Stack32(
				this.mem,
				this.options.memory - this.options.stacksize,
				this.options.rstacksize
			);

			this.fetch = this.fetch32;
			this.signed = this.signed32;
			this.store = this.store32;
		} else throw new Error('Invalid cell size');

		this.options.output.type(`browserforth v${ForthVersion} starting...`);

		ForthBuiltins.attach(this);
		//ExceptionWords.attach(this);
	}

	get unused() {
		return this.rstack.pbottom - this.here;
	}

	debug(...params: any[]) {
		if (this.options.debug) console.log(...params);
	}

	xw(s: string) {
		const words = this.words();
		if (words[s]) return this.execute(words[s]);

		throw new Error(`Undefined word: ${s}`);
	}

	throw(e: ForthException) {
		// TODO
		alert(`exception #${e}`);
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
			this.stack.push(data);
		} else if (winfo.flags & HeaderFlags.IsVariable) {
			this.stack.push(data);
		} else {
			// TODO
			throw new Error(`dunno how to execute ${xt} yet`);
		}
	}

	runString(s: string) {
		console.log('runString', s);
		throw new Error('Not implemented');
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

	signed16(x: number) {
		return new Int16Array([x])[0];
	}

	store16(addr: number, x: number) {
		this.mem.setUint16(addr, x);
		return addr + 2;
	}

	fetch32(addr: number) {
		return this.mem.getUint32(addr);
	}

	signed32(x: number) {
		return new Int32Array([x])[0];
	}

	store32(addr: number, x: number) {
		this.mem.setUint32(addr, x);
		return addr + 4;
	}
}
