import Forth from './Forth';
import ForthException from './ForthException';

const digits = '0123456789abcdefghijklmnopqrstuvwxyz';

export default class ForthBuiltins {
	static base: number;

	static attach(f: Forth) {
		f.addVariable('state', 0);
		ForthBuiltins.base = f.addVariable('base', 10);
		f.addVariable('>in', 0);
		f.addConstant('false', 0);
		f.addConstant('true', -1);

		// some useful internals
		f.addBuiltin('latestxt', this.latestxt);
		f.addBuiltin('sp@', this.sptop);
		f.addBuiltin('sp!', this.spstore);
		f.addBuiltin('rp@', this.rptop);
		f.addBuiltin('rp!', this.rpstore);

		f.addBuiltin('-', this.sub);
		f.addBuiltin(',', this.comma);
		f.addBuiltin('!', this.store);
		f.addBuiltin('?dup', this.qdup);
		f.addBuiltin('.', this.dot);
		// f.addBuiltin('."', this.showstring);
		f.addBuiltin('.s', this.showstack);
		// f.addBuiltin("'", this.quote);
		// f.addBuiltin('(', this.comment);
		f.addBuiltin('@', this.fetch);
		f.addBuiltin('*', this.mul);
		f.addBuiltin('*/', this.muldiv);
		f.addBuiltin('*/mod', this.muldivmod);
		f.addBuiltin('/', this.div);
		f.addBuiltin('/mod', this.divmod);
		// f.addBuiltin('#', this.picdigit);
		// f.addBuiltin('#>', this.picend);
		// f.addBuiltin('#s', this.picall);
		// f.addBuiltin('+!', this.addstore);
		f.addBuiltin('+', this.add);
		// f.addBuiltin('+loop', this.addloop);
		f.addBuiltin('<', this.lt);
		// f.addBuiltin('<#', this.picstart);
		f.addBuiltin('<>', this.ne);
		f.addBuiltin('=', this.eq);
		f.addBuiltin('>', this.gt);
		f.addBuiltin('>r', this.tor);
		f.addBuiltin('0<', this.zlt);
		f.addBuiltin('0<>', this.zne);
		f.addBuiltin('0=', this.zeq);
		f.addBuiltin('0>', this.zgt);
		f.addBuiltin('1-', this.dec);
		f.addBuiltin('1+', this.inc);
		// f.addBuiltin('2!', this.store2);
		// f.addBuiltin('2@', this.fetch2);
		// f.addBuiltin('2*', this.mul2);
		// f.addBuiltin('2/', this.div2);
		f.addBuiltin('2drop', this.drop2);
		f.addBuiltin('2dup', this.dup2);
		// f.addBuiltin('2over', this.over2);
		f.addBuiltin('2swap', this.swap2);
		f.addBuiltin('allot', this.allot);
		f.addBuiltin('and', this.and);
		f.addBuiltin('at-xy', this.atxy);
		f.addBuiltin('c,', this.ccomma);
		f.addBuiltin('count', this.count);
		f.addBuiltin('cr', this.cr);
		f.addBuiltin('depth', this.depth);
		f.addBuiltin('drop', this.drop);
		f.addBuiltin('dup', this.dup);
		f.addBuiltin('emit', this.emit);
		f.addBuiltin('execute', this.execute);
		f.addBuiltin('here', this.here);
		f.addBuiltin('key', this.key);
		f.addBuiltin('key?', this.keyq);
		f.addBuiltin('nip', this.nip);
		f.addBuiltin('or', this.or);
		f.addBuiltin('over', this.over);
		f.addBuiltin('r@', this.rpeek);
		f.addBuiltin('r>', this.fromr);
		f.addBuiltin('rot', this.rot);
		f.addBuiltin('swap', this.swap);
		f.addBuiltin('type', this.type);
		f.addBuiltin('u.', this.udot);
		f.addBuiltin('unused', this.unused);
		f.addBuiltin('within', this.within);
		f.addBuiltin('xor', this.xor);

		f.addBuiltin('evaluate', this.evaluate);
	}

	static dup(f: Forth) {
		const x = f.stack.top();
		f.stack.push(x);
	}

	static qdup(f: Forth) {
		const x = f.stack.top();
		if (x) f.stack.push(x);
	}

	static dup2(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.top();
		f.stack.push(x2);
		f.stack.push(x1);
		f.stack.push(x2);
	}

	static drop(f: Forth) {
		f.stack.pop();
	}

	static drop2(f: Forth) {
		f.stack.pop();
		f.stack.pop();
	}

	static swap(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.push(x2);
		f.stack.push(x1);
	}

	static swap2(f: Forth) {
		const x4 = f.stack.pop();
		const x3 = f.stack.pop();
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.push(x3);
		f.stack.push(x4);
		f.stack.push(x1);
		f.stack.push(x2);
	}

	static add(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();
		f.stack.push(n1 + n2);
	}

	static sub(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();
		f.stack.push(n1 - n2);
	}

	static comma(f: Forth) {
		const x = f.stack.pop();
		f.write(x);
	}

	static ccomma(f: Forth) {
		const c = f.stack.pop();
		f.write8(c);
	}

	static fetch(f: Forth) {
		const aaddr = f.stack.pop();
		f.stack.push(f.fetch(aaddr));
	}

	static store(f: Forth) {
		const aaddr = f.stack.pop();
		const x = f.stack.pop();
		f.store(aaddr, x);
	}

	static emit(f: Forth) {
		const c = f.stack.pop();
		f.options.output.emit(String.fromCharCode(c));
	}

	static count(f: Forth) {
		const caddr = f.stack.pop();
		f.stack.push(caddr + f.options.cellsize);
		f.stack.push(f.fetch(caddr));
	}

	static type(f: Forth) {
		const u = f.stack.pop();
		const caddr = f.stack.pop();
		const str = f.readString(caddr, u);
		f.options.output.type(str);
	}

	static cr(f: Forth) {
		f.options.output.cr();
	}

	static mul(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();
		f.stack.push(n1 * n2);
	}

	static div(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();

		if (n2 == 0) return f.throw(ForthException.divzero);

		f.stack.push(n1 / n2);
	}

	static muldiv(f: Forth) {
		const n3 = f.stack.pop();
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();

		if (n3 == 0) return f.throw(ForthException.divzero);

		f.stack.push((n1 * n2) / n3);
	}

	static muldivmod(f: Forth) {
		const n3 = f.stack.pop();
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();

		if (n3 == 0) return f.throw(ForthException.divzero);

		const product = n1 * n2;
		f.stack.push(product % n3);
		f.stack.push(product / n3);
	}

	static divmod(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();

		if (n2 == 0) return f.throw(ForthException.divzero);

		f.stack.push(n1 % n2);
		f.stack.push(n1 / n2);
	}

	static and(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.push(x1 & x2);
	}

	static or(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.push(x1 | x2);
	}

	static xor(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.push(x1 ^ x2);
	}

	static nip(f: Forth) {
		const x2 = f.stack.pop();
		f.stack.pop();
		f.stack.push(x2);
	}

	static over(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.push(x1);
		f.stack.push(x2);
		f.stack.push(x1);
	}

	static rot(f: Forth) {
		const x3 = f.stack.pop();
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.push(x2);
		f.stack.push(x3);
		f.stack.push(x1);
	}

	static depth(f: Forth) {
		f.stack.push(f.stack.contents.length);
	}

	static within(f: Forth) {
		const u3 = f.stack.pop();
		const u2 = f.stack.pop();
		const u1 = f.stack.pop();
		f.stack.pushf(u2 <= u1 && u1 < u3);
	}

	static lt(f: Forth) {
		const n2 = f.signed(f.stack.pop());
		const n1 = f.signed(f.stack.pop());
		f.stack.pushf(n1 < n2);
	}

	static eq(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.pushf(x1 == x2);
	}

	static ne(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.pushf(x1 != x2);
	}

	static gt(f: Forth) {
		const n2 = f.signed(f.stack.pop());
		const n1 = f.signed(f.stack.pop());
		f.stack.pushf(n1 > n2);
	}

	static zlt(f: Forth) {
		const n = f.signed(f.stack.pop());
		f.stack.pushf(n < 0);
	}

	static zeq(f: Forth) {
		const n = f.stack.pop();
		f.stack.pushf(n == 0);
	}

	static zne(f: Forth) {
		const n = f.stack.pop();
		f.stack.pushf(n != 0);
	}

	static zgt(f: Forth) {
		const n = f.signed(f.stack.pop());
		f.stack.pushf(n > 0);
	}

	static tor(f: Forth) {
		const x = f.stack.pop();
		f.rstack.push(x);
	}

	static fromr(f: Forth) {
		const x = f.rstack.pop();
		f.stack.push(x);
	}

	static rpeek(f: Forth) {
		const x = f.rstack.top();
		f.stack.push(x);
	}

	static dec(f: Forth) {
		const x = f.stack.pop();
		f.stack.push(x - 1);
	}

	static inc(f: Forth) {
		const x = f.stack.pop();
		f.stack.push(x + 1);
	}

	static atxy(f: Forth) {
		const ny = f.stack.pop();
		const nx = f.stack.pop();
		f.options.output.goto(nx, ny);
	}

	static unused(f: Forth) {
		f.stack.push(f.unused);
	}

	static async key(f: Forth) {
		return f.options.input.key().then(
			e => {
				// TODO: deprecated
				f.stack.push(e.charCode);
			},
			() => {
				// TODO: throw?
				f.stack.push(0);
			}
		);
	}

	static keyq(f: Forth) {
		f.stack.pushf(f.options.input.keyq);
	}

	static throw(f: Forth) {
		f.throw(f.signed(f.stack.pop()));
	}

	static sptop(f: Forth) {
		f.stack.push(f.stack.ptop);
	}

	static spstore(f: Forth) {
		f.stack.p = f.stack.pop();
	}

	static rptop(f: Forth) {
		f.stack.push(f.rstack.ptop);
	}

	static rpstore(f: Forth) {
		f.rstack.p = f.stack.pop();
	}

	static here(f: Forth) {
		f.stack.push(f.here);
	}

	static allot(f: Forth) {
		f.here += f.stack.pop();
	}

	static latestxt(f: Forth) {
		f.stack.push(f.link + f.options.cellsize);
	}

	static execute(f: Forth) {
		f.execute(f.stack.pop());
	}

	// TODO: this kinda sucks
	static async evaluate(f: Forth) {
		var len = f.stack.pop();
		var addr = f.stack.pop();
		var current = '';
		var exit = false;
		var blocking = Promise.resolve();

		const run = async () => {
			if (current) {
				if (f.words[current.toLowerCase()]) {
					const result = f.xw(current);
					if (result) {
						await result;
					}
				} else {
					const base = f.fetch(ForthBuiltins.base);
					const value = parseInt(current, base);
					if (isNaN(value)) {
						// TODO
						console.log('could not parse:', current);
						exit = true;
					} else {
						f.stack.push(value);
					}
				}

				current = '';
			}
		};

		while (len > 0) {
			const ch = String.fromCharCode(f.fetch8(addr));
			if (ch == ' ' || ch == '\r' || ch == '\n' || ch == '\t') {
				await run();
			} else {
				current += ch;
			}

			if (exit) break;
			addr++;

			len--;
		}
		run();
	}

	static udot(f: Forth) {
		const base = f.fetch(ForthBuiltins.base);
		const value = f.stack.pop();
		f.options.output.type(value.toString(base) + ' ');
	}

	static dot(f: Forth) {
		const base = f.fetch(ForthBuiltins.base);
		const value = f.signed(f.stack.pop());
		f.options.output.type(value.toString(base) + ' ');
	}

	static showstack(f: Forth) {
		const base = f.fetch(ForthBuiltins.base);
		f.options.output.type(`<${f.stack.contents.length.toString(base)}> `);

		f.stack.contents.forEach(n =>
			f.options.output.type(f.signed(n).toString(base) + ' ')
		);
	}
}
