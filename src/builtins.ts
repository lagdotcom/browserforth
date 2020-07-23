import Forth from './forth';

export class ForthBuiltins {
	static attach(f: Forth) {
		f.addVariable('state');
		f.addBuiltin('-', this.sub);
		f.addBuiltin(',', this.comma);
		f.addBuiltin('!', this.store);
		f.addBuiltin('@', this.fetch);
		f.addBuiltin('+', this.add);
		f.addBuiltin('c,', this.ccomma);
		f.addBuiltin('count', this.count);
		f.addBuiltin('drop', this.drop);
		f.addBuiltin('dup', this.dup);
		f.addBuiltin('emit', this.emit);
		f.addBuiltin('type', this.type);
	}

	static dup(f: Forth) {
		const x = f.pop();
		f.push(x);
		f.push(x);
	}

	static drop(f: Forth) {
		f.pop();
	}

	static add(f: Forth) {
		const n2 = f.pop();
		const n1 = f.pop();
		f.push(n1 + n2);
	}

	static sub(f: Forth) {
		const n2 = f.pop();
		const n1 = f.pop();
		f.push(n1 - n2);
	}

	static comma(f: Forth) {
		const x = f.pop();
		f.write(x);
	}

	static ccomma(f: Forth) {
		const c = f.pop();
		f.write8(c);
	}

	static fetch(f: Forth) {
		const addr = f.pop();
		f.push(f.fetch(addr));
	}

	static store(f: Forth) {
		const addr = f.pop();
		const x = f.pop();
		f.store(addr, x);
	}

	static emit(f: Forth) {
		const ch = f.pop();
		f.options.output.emit(String.fromCharCode(ch));
	}

	static count(f: Forth) {
		const addr = f.pop();
		f.push(addr + f.options.cellsize);
		f.push(f.fetch(addr));
	}

	static type(f: Forth) {
		const len = f.pop();
		const addr = f.pop();
		const str = f.readString(addr, len);
		f.options.output.type(str);
	}
}
