import Forth from './forth';

export class ForthBuiltins {
	static attach(f: Forth) {
		f.addVariable('state');
		f.addBuiltin('dup', this.dup);
		f.addBuiltin('drop', this.drop);
		f.addBuiltin('+', this.add);
		f.addBuiltin('-', this.sub);
		f.addBuiltin(',', this.comma);
		f.addBuiltin('c,', this.ccomma);
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
}
