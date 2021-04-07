import pkg from '../package.json';
import ForthBuiltins from './ForthBuiltins';
import ForthException from './ForthException';
import Input from './input/Input';
import NullInput from './input/NullInput';
import NullOutput from './output/NullOutput';
import Output from './output/Output';
import Stack from './stack/Stack';
import Stack16 from './stack/Stack16';
import Stack32 from './stack/Stack32';

interface ForthOptions {
	cellsize: number;
	debug: boolean;
	exceptions: boolean;
	input: Input;
	memory: number;
	output: Output;
	rstacksize: number;
	stacksize: number;
}

export type ForthBuiltin = (f: Forth) => Promise<void> | void;

export enum HeaderFlags {
	LengthMask = 0x00ff,
	IsWord = 0x0100,
	IsCreate = 0x0400,
	IsCompileOnly = 0x0800,
	IsBuiltin = 0x1000,
	IsVariable = 0x2000,
	IsConstant = 0x4000,
	IsImmediate = 0x8000,
}

export type GetterSetter<T> = (x?: T) => T;

export default class Forth {
	private buffer: ArrayBuffer;
	private builtins: ForthBuiltin[];
	exception: ForthException;
	fetch: (addr: number) => number;
	ip: number;
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
			exceptions:
				typeof options.exceptions !== 'undefined' ? options.exceptions : false,
			input: options.input || new NullInput(),
			memory: options.memory || 60000,
			output: options.output || new NullOutput(),
			rstacksize: options.rstacksize || 64,
			stacksize: options.stacksize || 64,
		};

		this.buffer = new ArrayBuffer(this.options.memory);
		this.builtins = [];
		this.exception = 0;
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

		this.options.output.type(`browserforth v${pkg.version} starting...\n`);
		this.ip = 0;

		// base system definitions
		this.sys = {};
		this.syso = 0;
		this.allocSysVar('dp');
		this.allocSysVar('link');
		this.addSysVars();
	}

	async initialise() {
		await ForthBuiltins.attach(this);
		//await ExceptionWords.attach(this);
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

	xw(s: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const words = this.words;
			if (words[s]) {
				const xt = words[s];
				const winfo = this.wordinfo(xt);

				const state = ForthBuiltins.state();
				if (state) {
					if (winfo.flags & HeaderFlags.IsImmediate) {
						await this.execute(xt);
						if (this.exception) return reject();
						return resolve();
					}

					this.debug('compile:', winfo.name);
					this.write(xt);
					return resolve();
				} else {
					if (winfo.flags & HeaderFlags.IsCompileOnly) {
						this.throw(
							ForthException.compileonlyinterpret,
							`compile-only word: ${s}`
						);
						return reject();
					}
					await this.execute(xt);
					if (this.exception) return reject();
					return resolve();
				}
			}

			this.throw(ForthException.undefinedword, `undefined word: ${s}`);
			return reject();
		});
	}

	throw(e: ForthException, err: string) {
		this.exception = e;

		console.log('exception:', e, err);
		if (this.options.exceptions)
			throw new Error(`Forth exception #${e}: ${err}`);

		// TODO
		alert(`exception #${e}: ${err}`);
	}

	async execute(xt: number) {
		return new Promise<void>(async (resolve, reject) => {
			const winfo = this.wordinfo(xt);
			const code = this.fetch(winfo.cfa);

			if (!(winfo.flags & HeaderFlags.IsWord)) {
				return reject(`trying to execute non-word: ${xt}`);
			}

			this.debug('execute:', winfo.name);

			if (winfo.flags & HeaderFlags.IsBuiltin) {
				try {
					await this.builtins[code](this);
					return resolve();
				} catch (e) {
					this.debug('js exception:', e);
					this.exception = -1;
				}
			} else if (winfo.flags & HeaderFlags.IsConstant) {
				this.stack.push(code);
				return resolve();
			} else if (winfo.flags & HeaderFlags.IsVariable) {
				this.stack.push(code);
				return resolve();
			} else {
				let ip = code;
				if (winfo.flags & HeaderFlags.IsCreate) {
					this.stack.push(winfo.dfa);
					ip = winfo.cfa;
				}
				this.rstack.push(this.ip);
				this.ip = ip;
				await this.runCpu();
				return resolve();
			}
		});
	}

	async runCpu() {
		while (this.rstack.contents.length) {
			const xt = this.fetch(this.ip);
			this.ip += this.options.cellsize;
			const result = this.execute(xt);
			if (result) await result;
			if (this.exception) return;
		}
	}

	runString(s: string): Promise<void> {
		const addr = this.here + 1000;
		const saddr = this.writeStringAt(addr, s);

		this.exception = 0;
		this.stack.push(saddr);
		this.stack.push(s.length);
		return this.xw('evaluate');
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
		const flags: HeaderFlags = lenflags - len;
		const name = this.readString(xt + cellsize, len);
		const cfa = xt + cellsize + len;
		const dfa = cfa + cellsize;

		return { lfa, link, xt, len, flags, name, cfa, dfa };
	}

	addBuiltin(name: string, b: ForthBuiltin, flags: HeaderFlags = 0) {
		const bid = this.builtins.length;
		this.debug('builtin:', name, bid);

		this.header(name, HeaderFlags.IsBuiltin | flags);
		// TODO: this isn't technically needed; could use the builtin's name as a lookup!
		this.write(bid);
		this.builtins.push(b);
	}

	addConstant(name: string, value: number) {
		this.debug('constant:', name, value);

		this.header(name, HeaderFlags.IsConstant);
		this.write(value);
	}

	addVariable(
		name: string,
		initial: number = 0,
		org?: number
	): GetterSetter<number> {
		this.debug('variable:', name, initial, org);

		if (typeof org === 'undefined') {
			org = this.here;
			this.write(initial);
		}

		const addr = org;
		this.header(name, HeaderFlags.IsVariable);
		this.write(org);
		return (n?: number) => {
			if (typeof n === 'number') this.store(addr, n);
			return this.fetch(addr);
		};
	}

	readString(addr: number, len: number) {
		const slice = this.buffer.slice(addr, addr + len);
		const decoder = new TextDecoder('utf-8');
		return decoder.decode(slice);
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

	header(name: string, flags: HeaderFlags = 0) {
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
