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
	mem: DataView;
	options: ForthOptions;
	rstack: Stack;
	signed: (x: number) => number;
	stack: Stack;
	store: (addr: number, x: number) => number;
	sys: { [name: string]: number };
	syso: number;

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

		this.options.output.type(`browserforth v${ForthVersion} starting...\n`);

		// base system definitions
		this.sys = {};
		this.syso = 0;
		this.allocSysVar('dp');
		this.allocSysVar('link');
		this.addSysVars();

		ForthBuiltins.attach(this);
		//ExceptionWords.attach(this);
	}

	get here() {
		return this.fetch(this.sys.dp);
	}

	set here(x: number) {
		this.store(this.sys.dp, x);
	}

	get link() {
		return this.fetch(this.sys.link);
	}

	set link(x: number) {
		this.store(this.sys.link, x);
	}

	get unused() {
		return this.rstack.pbottom - this.here;
	}

	private allocSysVar(name: string) {
		this.sys[name] = this.syso;
		this.syso += this.options.cellsize;
	}

	private addSysVars() {
		this.here = this.syso;
		for (var name in this.sys) {
			this.addVariable(name, 0, this.sys[name]);
		}
	}

	debug(...params: any[]) {
		if (this.options.debug) console.log(...params);
	}

	xw(s: string) {
		const words = this.words;
		if (words[s]) return this.execute(words[s]);

		throw new Error(`Undefined word: ${s}`);
	}

	throw(e: ForthException) {
		// TODO
		alert(`exception #${e}`);
	}

	execute(xt: number) {
		const winfo = this.wordinfo(xt);
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
		const addr = this.here + 1000;
		const saddr = this.writeStringAt(addr, s);

		this.stack.push(saddr);
		this.stack.push(s.length);
		this.xw('evaluate');
	}

	get words() {
		const wordlist: { [name: string]: number } = {};

		var link = this.link;
		while (link) {
			const winfo = this.wordinfo(link + this.options.cellsize);
			wordlist[winfo.name] = winfo.xt;

			link = winfo.link;
		}

		return wordlist;
	}

	wordinfo(xt: number) {
		const { cellsize } = this.options;

		const lfa = xt - cellsize;
		const link = this.fetch(lfa);

		const lenflags = this.fetch(xt);
		const len = lenflags & HeaderFlags.LengthMask;
		const flags = lenflags - len;
		const name = this.readString(xt + cellsize, len);
		const cfa = xt + cellsize + (lenflags & HeaderFlags.LengthMask);

		return { lfa, link, xt, len, flags, name, cfa };
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

	addVariable(name: string, initial: number = 0, org?: number) {
		this.debug('variable:', name, initial, org);

		if (typeof org === 'undefined') {
			org = this.here;
			this.write(initial);
		}

		this.header(name, HeaderFlags.IsVariable);
		this.write(org);
		return org;
	}

	readString(addr: number, len: number) {
		const slice = this.buffer.slice(addr, addr + len);
		return Buffer.from(slice).toString();
	}

	writeString(str: string, override?: number) {
		const length = typeof override === 'undefined' ? str.length : override;
		this.write(length);
		for (var i = 0; i < str.length; i++) this.write8(str.charCodeAt(i));
	}

	writeStringAt(addr: number, str: string, override?: number) {
		const length = typeof override === 'undefined' ? str.length : override;
		const start = this.store(addr, length);
		for (var i = 0; i < str.length; i++)
			this.store8(start + i, str.charCodeAt(i));

		return start;
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

	fetch8(addr: number) {
		return this.mem.getUint8(addr);
	}

	store8(addr: number, x: number) {
		this.mem.setUint8(addr, x);
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
