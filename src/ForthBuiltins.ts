import Forth, { GetterSetter, HeaderFlags } from './Forth';
import ForthException from './ForthException';

const whitespaces = [' ', '\r', '\n', '\t'];
function isWhitespace(ch: string) {
	return ch == ' ' || ch == '\r' || ch == '\n' || ch == '\t';
}

// TODO: turn into a primitive
function scan(f: Forth, ...until: string[]) {
	const { sourceAddr, sourceLen, toIn } = ForthBuiltins;
	let current = '';

	while (toIn() < sourceLen()) {
		const ch = String.fromCharCode(f.fetch8(sourceAddr() + toIn()));
		toIn(toIn() + 1);

		if (until.includes(ch)) return current;
		current += ch;
	}

	if (current) return current;
}

function doPictureDigit(full: number, base: number) {
	const digit = (full % base).toString(base);
	const value = Math.floor(full / base);

	return { value, char: digit.charCodeAt(0) };
}

function aligned(addr: number, mod: number) {
	const offset = addr % mod;
	return offset ? addr - offset + mod : addr;
}

// TODO: is this always correct?
function loopPassed(limit: number, index: number, step: number, orig: number) {
	if (step > 0) {
		return index >= limit && orig < limit;
	} else {
		return index < limit && orig >= limit;
	}
}

const numberChars = '0123456789abcdefghijklmnopqrstuvwxyz';
function asNumber(
	src: string,
	base: number
): [value: number, left: number, double: boolean] {
	if (src[0] === "'" && src[2] === "'") return [src.charCodeAt(1), 0, false];

	var i = 0;
	if (src[i] === '#') {
		base = 10;
		i++;
	} else if (src[i] === '$') {
		base = 16;
		i++;
	} else if (src[i] === '%') {
		base = 2;
		i++;
	}

	var negative = false;
	if (src[i] === '-') {
		negative = true;
		i++;
	}

	var double = false;
	var value = 0;
	const avail = numberChars.slice(0, base);
	const num = src.toLowerCase();
	for (; i < src.length; i++) {
		const ch = num[i];
		const j = avail.indexOf(ch);
		if (j >= 0) value = value * base + j;
		else {
			if (ch === '.' && i == src.length - 1) {
				double = true;
				break;
			}

			if (negative) value = -value;
			return [value, src.length - i, double];
		}
	}

	if (negative) value = -value;
	return [value, 0, double];
}

export default class ForthBuiltins {
	// TODO: remove the need for these; they prevent saving as binary
	static base: GetterSetter<number>;
	static picbuf: number;
	static sourceAddr: GetterSetter<number>;
	static sourceId: GetterSetter<number>;
	static sourceLen: GetterSetter<number>;
	static state: GetterSetter<number>;
	static toPicbuf: GetterSetter<number>;
	static toIn: GetterSetter<number>;
	static wordbuf: number;

	static async attach(f: Forth) {
		const { IsHidden, IsImmediate, IsCompileOnly } = HeaderFlags;

		ForthBuiltins.state = f.addVariable('state', 0);
		ForthBuiltins.base = f.addVariable('base', 10);
		ForthBuiltins.sourceAddr = f.addVariable('source-addr', 0);
		ForthBuiltins.sourceId = f.addVariable('source-id', 0);
		ForthBuiltins.sourceLen = f.addVariable('source-len', 0);
		ForthBuiltins.toIn = f.addVariable('>in', 0);

		f.here += f.options.holdsize;
		ForthBuiltins.picbuf = f.here;
		f.addConstant('picbuf', ForthBuiltins.picbuf, IsHidden);
		ForthBuiltins.toPicbuf = f.addVariable(
			'>picbuf',
			ForthBuiltins.picbuf,
			IsHidden
		);

		ForthBuiltins.wordbuf = f.here;
		f.here += f.options.wordsize;

		f.addConstant('false', 0);
		f.addConstant('true', -1);

		// some useful internals
		f.addBuiltin('latestxt', this.latestxt);
		f.addBuiltin('sp@', this.sptop);
		f.addBuiltin('sp!', this.spstore);
		f.addBuiltin('rp@', this.rptop);
		f.addBuiltin('rp!', this.rpstore);
		f.addBuiltin('rdrop', this.rdrop);
		f.addBuiltin('2rdrop', this.rdrop2);

		// --- nonstandard
		f.addBuiltin('compile-only', this.compileonly);
		f.addBuiltin('debug!', this.setdebug);
		f.addBuiltin('s=', this.seq);
		f.addBuiltin('(literal)', this.literalRt, IsHidden);
		f.addBuiltin('(2literal)', this.literal2Rt, IsHidden);
		f.addBuiltin('(sliteral)', this.sliteralRt, IsHidden);
		f.addBuiltin('(branch)', this.branch, IsHidden);
		f.addBuiltin('(branch0)', this.branch0, IsHidden);
		f.addBuiltin('(do)', this.doRt, IsHidden);
		f.addBuiltin('(loop)', this.loopRt, IsHidden);
		f.addBuiltin('(+loop)', this.addloopRt, IsHidden);

		// --- core
		f.addBuiltin('!', this.store);
		f.addBuiltin('#', this.picdigit);
		f.addBuiltin('#>', this.picend);
		f.addBuiltin('#s', this.picall);
		f.addBuiltin("'", this.quote);
		f.addBuiltin('(', this.comment, IsImmediate);
		f.addBuiltin('*', this.mul);
		f.addBuiltin('*/', this.muldiv);
		f.addBuiltin('*/mod', this.muldivmod);
		f.addBuiltin('+', this.add);
		f.addBuiltin('+!', this.addstore);
		f.addBuiltin('+loop', this.addloop, IsImmediate | IsCompileOnly);
		f.addBuiltin(',', this.comma);
		f.addBuiltin('-', this.sub);
		f.addBuiltin('.', this.dot);
		f.addBuiltin('."', this.dotquote);
		f.addBuiltin('/', this.div);
		f.addBuiltin('/mod', this.divmod);
		f.addBuiltin('0<', this.zlt);
		f.addBuiltin('0=', this.zeq);
		f.addBuiltin('1+', this.inc);
		f.addBuiltin('1-', this.dec);
		f.addBuiltin('2!', this.store2);
		f.addBuiltin('2*', this.mul2);
		f.addBuiltin('2/', this.div2);
		f.addBuiltin('2@', this.fetch2);
		f.addBuiltin('2drop', this.drop2);
		f.addBuiltin('2dup', this.dup2);
		f.addBuiltin('2over', this.over2);
		f.addBuiltin('2swap', this.swap2);
		f.addBuiltin(':', this.colon);
		f.addBuiltin(';', this.semicolon, IsImmediate | IsCompileOnly);
		f.addBuiltin('<', this.lt);
		f.addBuiltin('<#', this.picstart);
		f.addBuiltin('=', this.eq);
		f.addBuiltin('>', this.gt);
		f.addBuiltin('>body', this.tobody);
		f.addBuiltin('>number', this.toNumber);
		f.addBuiltin('>r', this.tor);
		f.addBuiltin('?dup', this.qdup);
		f.addBuiltin('@', this.fetch);
		f.addBuiltin('abort', this.abort);
		f.addBuiltin('abort"', this.aborts);
		f.addBuiltin('abs', this.abs);
		f.addBuiltin('accept', this.accept);
		f.addBuiltin('align', this.align);
		f.addBuiltin('aligned', this.aligned);
		f.addBuiltin('allot', this.allot);
		f.addBuiltin('and', this.and);
		f.addBuiltin('begin', this.begin, IsImmediate | IsCompileOnly);
		f.addBuiltin('bl', this.bl);
		f.addBuiltin('c!', this.cstore);
		f.addBuiltin('c,', this.ccomma);
		f.addBuiltin('c@', this.cfetch);
		f.addBuiltin('cell+', this.cellp);
		f.addBuiltin('cells', this.cells);
		f.addBuiltin('char', this.char);
		f.addBuiltin('char+', this.charp);
		f.addBuiltin('chars', this.chars);
		f.addBuiltin('count', this.count);
		f.addBuiltin('cr', this.cr);
		f.addBuiltin('create', this.create);
		f.addBuiltin('decimal', this.decimal);
		f.addBuiltin('depth', this.depth);
		f.addBuiltin('do', this.do, IsImmediate | IsCompileOnly);
		f.addBuiltin('does>', this.does);
		f.addBuiltin('drop', this.drop);
		f.addBuiltin('dup', this.dup);
		f.addBuiltin('else', this.else, IsImmediate | IsCompileOnly);
		f.addBuiltin('emit', this.emit);
		f.addBuiltin('environment?', this.envq);
		f.addBuiltin('evaluate', this.evaluate);
		f.addBuiltin('execute', this.execute);
		f.addBuiltin('exit', this.exit);
		f.addBuiltin('fill', this.fill);
		f.addBuiltin('find', this.find);
		f.addBuiltin('fm/mod', this.fmmod);
		f.addBuiltin('here', this.here);
		f.addBuiltin('hold', this.hold);
		f.addBuiltin('i', this.rpeek);
		f.addBuiltin('if', this.if, IsImmediate | IsCompileOnly);
		f.addBuiltin('immediate', this.immediate);
		f.addBuiltin('invert', this.invert);
		f.addBuiltin('j', this.rpeek2);
		f.addBuiltin('key', this.key);
		f.addBuiltin('leave', this.leave, IsImmediate | IsCompileOnly);
		f.addBuiltin('literal', this.literal, IsImmediate | IsCompileOnly);
		f.addBuiltin('loop', this.loop, IsImmediate | IsCompileOnly);
		f.addBuiltin('lshift', this.lshift);
		f.addBuiltin('m*', this.mmul);
		f.addBuiltin('max', this.max);
		f.addBuiltin('min', this.min);
		f.addBuiltin('mod', this.mod);
		f.addBuiltin('move', this.move);
		f.addBuiltin('negate', this.negate);
		f.addBuiltin('or', this.or);
		f.addBuiltin('over', this.over);
		f.addBuiltin('postpone', this.postpone, IsImmediate | IsCompileOnly);
		// f.addBuiltin('quit', this.quit);
		f.addBuiltin('r>', this.fromr);
		f.addBuiltin('r@', this.rpeek);
		f.addBuiltin('recurse', this.recurse, IsImmediate | IsCompileOnly);
		f.addBuiltin('repeat', this.repeat, IsImmediate | IsCompileOnly);
		f.addBuiltin('rot', this.rot);
		f.addBuiltin('rshift', this.rshift);
		f.addBuiltin('s"', this.squote, IsImmediate);
		f.addBuiltin('s>d', this.stod);
		f.addBuiltin('sign', this.picsign);
		f.addBuiltin('sm/rem', this.smrem);
		f.addBuiltin('source', this.source);
		f.addBuiltin('space', this.space);
		f.addBuiltin('spaces', this.spaces);
		f.addBuiltin('swap', this.swap);
		f.addBuiltin('then', this.then, IsImmediate | IsCompileOnly);
		f.addBuiltin('type', this.type);
		f.addBuiltin('u.', this.udot);
		f.addBuiltin('u<', this.ult);
		f.addBuiltin('um*', this.ummul);
		f.addBuiltin('um/mod', this.ummod);
		f.addBuiltin('unloop', this.rdrop2);
		f.addBuiltin('until', this.until, IsImmediate | IsCompileOnly);
		f.addBuiltin('while', this.while, IsImmediate | IsCompileOnly);
		f.addBuiltin('word', this.word);
		f.addBuiltin('xor', this.xor);
		f.addBuiltin('[', this.interpretMode, IsImmediate | IsCompileOnly);
		f.addBuiltin(']', this.compileMode);
		await f.runString(": ['] ' postpone literal ; immediate compile-only");
		await f.runString(
			': [char] char postpone literal ; immediate compile-only'
		);
		await f.runString(': nop ;');
		await f.runString(': constant create , does> @ ;');
		await f.runString(': variable create 0 , ;');

		// --- core-ext
		// f.addBuiltin('.(', this.dotbracket);
		// f.addBuiltin('.r', this.dotr);
		f.addBuiltin('0<>', this.zne);
		f.addBuiltin('0>', this.zgt);
		f.addBuiltin('2>r', this.dtor);
		f.addBuiltin('2r>', this.dfromr);
		f.addBuiltin('2r@', this.drpeek);
		// f.addBuiltin(':noname', this.noname);
		f.addBuiltin('<>', this.ne);
		// f.addBuiltin('?do', this.qdo);
		// f.addBuiltin('action-of', this.actionof);
		// f.addBuiltin('again', this.again);
		await f.runString(': buffer: create allot ;');
		// f.addBuiltin('c"', this.cquote);
		// f.addBuiltin('case', this.case);
		// f.addBuiltin('compile,', this.compile);
		// f.addBuiltin('defer', this.defer);
		// f.addBuiltin('defer!', this.deferstore);
		// f.addBuiltin('defer@', this.deferfetch);
		// f.addBuiltin('endcase', this.endcase);
		// f.addBuiltin('endof', this.endof);
		// f.addBuiltin('erase', this.erase);
		// f.addBuiltin('false', this.false);
		f.addBuiltin('hex', this.hex);
		f.addBuiltin('holds', this.holds);
		// f.addBuiltin('is', this.is);
		// f.addBuiltin('marker', this.marker);
		f.addBuiltin('nip', this.nip);
		// f.addBuiltin('of', this.of);
		// f.addBuiltin('pad', this.pad);
		// f.addBuiltin('parse', this.parse);
		// f.addBuiltin('parse-name', this.parsename);
		// f.addBuiltin('pick', this.pick);
		// f.addBuiltin('refill', this.refill);
		// f.addBuiltin('restore-input', this.restoreinput);
		// f.addBuiltin('roll', this.roll);
		// f.addBuiltin('s\\"', this.sbackquote);
		// f.addBuiltin('save-input', this.saveinput);
		// f.addBuiltin('to', this.to);
		// f.addBuiltin('true', this.true);
		// f.addBuiltin('tuck', this.tuck);
		// f.addBuiltin('u.r', this.udotr);
		// f.addBuiltin('u>', this.ugt);
		f.addBuiltin('unused', this.unused);
		// f.addBuiltin('value', this.value);
		f.addBuiltin('within', this.within);
		f.addBuiltin('\\', this.backslash, IsImmediate);

		// --- double-number (incomplete list)
		f.addBuiltin('2literal', this.literal2, IsImmediate | IsCompileOnly);
		f.addBuiltin('d.', this.ddot);
		f.addBuiltin('d=', this.deq);
		await f.runString(': 2variable create 0 , 0 , ;');

		// --- facility (incomplete list)
		f.addBuiltin('at-xy', this.atxy);
		f.addBuiltin('key?', this.keyq);

		// --- programming-tools (incomplete list)
		f.addBuiltin('.s', this.showstack);
		f.addBuiltin('words', this.words);
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
		const x2 = f.stack.top(1);
		const x1 = f.stack.top();
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
	static cfetch(f: Forth) {
		const aaddr = f.stack.pop();
		f.stack.push(f.fetch8(aaddr));
	}
	static fetch2(f: Forth) {
		const aaddr = f.stack.pop();
		f.stack.pushd(f.fetchd(aaddr));
	}

	static store(f: Forth) {
		const aaddr = f.stack.pop();
		const x = f.stack.pop();
		f.store(aaddr, x);
	}
	static cstore(f: Forth) {
		const aaddr = f.stack.pop();
		const x = f.stack.pop();
		f.store8(aaddr, x);
	}
	static store2(f: Forth) {
		const aaddr = f.stack.pop();
		const d = f.stack.popd();
		f.stored(aaddr, d);
	}
	static addstore(f: Forth) {
		const aaddr = f.stack.pop();
		const x = f.stack.pop();
		f.store(aaddr, f.fetch(aaddr) + x);
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

		if (n2 == 0) return f.throw(ForthException.divzero, 'division by zero');

		f.stack.push(n1 / n2);
	}

	static mod(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();

		if (n2 == 0) return f.throw(ForthException.divzero, 'division by zero');

		f.stack.push(n1 % n2);
	}

	static muldiv(f: Forth) {
		const n3 = f.stack.pop();
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();

		if (n3 == 0) return f.throw(ForthException.divzero, 'division by zero');

		f.stack.push((n1 * n2) / n3);
	}

	static muldivmod(f: Forth) {
		const n3 = f.stack.pop();
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();

		if (n3 == 0) return f.throw(ForthException.divzero, 'division by zero');

		const product = n1 * n2;
		f.stack.push(product % n3);
		f.stack.push(product / n3);
	}

	static divmod(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();

		if (n2 == 0) return f.throw(ForthException.divzero, 'division by zero');

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
		const x = f.stack.top(1);
		f.stack.push(x);
	}
	static over2(f: Forth) {
		const x2 = f.stack.top(2);
		const x1 = f.stack.top(3);
		f.stack.push(x1);
		f.stack.push(x2);
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
	static ult(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();
		f.stack.pushf(n1 < n2);
	}

	static eq(f: Forth) {
		const x2 = f.stack.pop();
		const x1 = f.stack.pop();
		f.stack.pushf(x1 == x2);
	}
	static deq(f: Forth) {
		const d2 = f.stack.popd();
		const d1 = f.stack.popd();
		f.stack.pushf(d1 == d2);
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
	static dtor(f: Forth) {
		const d = f.stack.popd();
		f.rstack.pushd(d);
	}

	static fromr(f: Forth) {
		const x = f.rstack.pop();
		f.stack.push(x);
	}
	static dfromr(f: Forth) {
		const d = f.rstack.popd();
		f.stack.pushd(d);
	}

	static rpeek(f: Forth) {
		const x = f.rstack.top();
		f.stack.push(x);
	}
	static rpeek2(f: Forth) {
		const x = f.rstack.top(2);
		f.stack.push(x);
	}
	static drpeek(f: Forth) {
		const d = f.rstack.topd();
		f.stack.pushd(d);
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
			e => f.stack.push(e.code),
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
		f.throw(f.signed(f.stack.pop()), 'throw');
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
		f.here += f.signed(f.stack.pop());
	}

	static latestxt(f: Forth) {
		f.stack.push(f.link + f.options.cellsize);
	}

	static async execute(f: Forth) {
		await f.execute(f.stack.pop());
	}

	// TODO: this kinda sucks, still
	static async evaluate(f: Forth) {
		const {
			base,
			sourceAddr,
			sourceLen,
			sourceId,
			state,
			toIn,
		} = ForthBuiltins;
		sourceLen(f.stack.pop());
		sourceAddr(f.stack.pop());
		sourceId(-1);
		toIn(0);

		var current = '';
		var exit = false;

		const handle = async () => {
			if (current) {
				const lc = current.toLowerCase();
				if (f.viswords[lc]) {
					await f.xw(lc);
				} else {
					const [value, left, double] = asNumber(current, base());
					if (left) {
						f.throw(
							ForthException.invalidnumber,
							`invalid number: ${current} (in base ${base()})`
						);
					} else {
						f.debug('number:', value);
						double ? f.stack.pushd(value) : f.stack.push(value);
						if (state())
							double ? ForthBuiltins.literal2(f) : ForthBuiltins.literal(f);
					}
				}

				if (f.exception) exit = true;
				current = '';
			}
		};

		while (toIn() < sourceLen()) {
			const ch = String.fromCharCode(f.fetch8(sourceAddr() + toIn()));
			toIn(toIn() + 1);

			if (isWhitespace(ch)) {
				await handle();
				if (exit) break;
			} else {
				current += ch;
			}
		}
		await handle();

		sourceId(0);
	}

	static udot(f: Forth) {
		const base = ForthBuiltins.base();
		const value = f.stack.pop();
		f.options.output.type(value.toString(base) + ' ');
	}
	static dot(f: Forth) {
		const base = ForthBuiltins.base();
		const value = f.signed(f.stack.pop());
		f.options.output.type(value.toString(base) + ' ');
	}
	static ddot(f: Forth) {
		const base = ForthBuiltins.base();
		const value = f.stack.popd();
		f.options.output.type(value.toString(base) + ' ');
	}

	static showstack(f: Forth) {
		const base = ForthBuiltins.base();
		f.options.output.type(`<${f.stack.contents.length.toString(base)}> `);

		f.stack.contents.forEach(n =>
			f.options.output.type(f.signed(n).toString(base) + ' ')
		);
	}

	static dotquote(f: Forth) {
		const result = scan(f, '"');
		if (typeof result === 'string') {
			f.options.output.type(result);
			return;
		}

		// TODO
		f.options.output.type('mismatched quote\n');
	}

	static source(f: Forth) {
		const { sourceAddr, sourceLen } = ForthBuiltins;
		f.stack.push(sourceAddr());
		f.stack.push(sourceLen());
	}

	static quote(f: Forth) {
		const result = scan(f, ...whitespaces);
		if (typeof result === 'string') {
			const xt = f.viswords[result.toLowerCase()];
			if (!xt)
				return f.throw(
					ForthException.undefinedword,
					`undefined word: ${result}`
				);

			f.stack.push(xt);
			return;
		}

		// TODO
		f.options.output.type("invalid use of '\n");
	}

	static postpone(f: Forth) {
		const result = scan(f, ...whitespaces);
		if (typeof result === 'string') {
			const xt = f.viswords[result.toLowerCase()];
			if (!xt)
				return f.throw(
					ForthException.undefinedword,
					`undefined word: ${result}`
				);

			f.debug('compile:', result);
			f.write(xt);
			return;
		}

		// TODO
		f.options.output.type('invalid use of postpone\n');
	}

	static comment(f: Forth) {
		const result = scan(f, ')');
		if (typeof result === 'string') return;

		// TODO
		f.options.output.type('mismatched (\n');
	}

	static words(f: Forth) {
		const wdict = f.viswords;
		f.options.output.type(Object.keys(wdict).join(' '));
	}

	static interpretMode(f: Forth) {
		ForthBuiltins.state(0);
	}

	static compileMode(f: Forth) {
		ForthBuiltins.state(1);
	}

	static literal(f: Forth) {
		const x = f.stack.pop();
		f.debug('compile: (literal)', x);
		f.write(f.words['(literal)']);
		f.write(x);
	}
	static literalRt(f: Forth) {
		const value = f.fetch(f.ip);
		f.ip += f.options.cellsize;
		f.stack.push(value);
	}

	static literal2(f: Forth) {
		const d = f.stack.popd();
		f.debug('compile: (2literal)', d);
		f.write(f.words['(2literal)']);
		f.writed(d);
	}
	static literal2Rt(f: Forth) {
		const d = f.fetchd(f.ip);
		f.ip += f.options.cellsize * 2;
		f.stack.pushd(d);
	}

	static exit(f: Forth) {
		f.popIp();
	}

	static async colon(f: Forth) {
		// parse-name header, ]
		const result = scan(f, ...whitespaces);
		if (typeof result === 'string') {
			const name = result.toLowerCase();
			f.debug('defining:', name);
			f.header(name);
			const cfa = f.here + f.options.cellsize;
			f.write(cfa);
			return ForthBuiltins.compileMode(f);
		}

		// TODO
		f.options.output.type('no word???');
	}

	static async semicolon(f: Forth) {
		// TODO: check cstack

		// postpone exit [
		const xt = f.words.exit;
		f.debug('compile: exit');
		f.write(xt);
		ForthBuiltins.interpretMode(f);
	}

	static char(f: Forth) {
		const result = scan(f, ...whitespaces);
		if (typeof result === 'string') {
			const value = result.charCodeAt(0);
			f.stack.push(value);
			return;
		}

		// TODO
		f.options.output.type('no word???');
	}

	static immediate(f: Forth) {
		const xt = f.link + f.options.cellsize;
		f.store(xt, f.fetch(xt) | HeaderFlags.IsImmediate);
	}

	static compileonly(f: Forth) {
		const xt = f.link + f.options.cellsize;
		f.store(xt, f.fetch(xt) | HeaderFlags.IsCompileOnly);
	}

	static abs(f: Forth) {
		const n = f.signed(f.stack.pop());
		f.stack.push(n < 0 ? -n : n);
	}

	static bl(f: Forth) {
		f.stack.push(' '.charCodeAt(0));
	}

	static decimal(f: Forth) {
		ForthBuiltins.base(10);
	}

	static hex(f: Forth) {
		ForthBuiltins.base(16);
	}

	static create(f: Forth) {
		const result = scan(f, ...whitespaces);
		if (typeof result === 'string') {
			const name = result.toLowerCase();
			f.debug('defining:', name);
			f.here = aligned(f.here, f.options.cellsize);
			f.header(name, HeaderFlags.IsCreate);

			const xt = f.words.nop;
			const winfo = f.wordinfo(xt);
			f.debug(`${name} does> nop`);
			f.write(winfo.dfa);
			return;
		}

		// TODO
		f.options.output.type('no word???');
	}

	static does(f: Forth) {
		const xt = f.link + f.options.cellsize;
		const winfo = f.wordinfo(xt);
		f.debug(`${winfo.name} does> ${f.ip}`);
		f.store(winfo.cfa, f.ip);
		f.popIp();
	}

	static tobody(f: Forth) {
		const xt = f.stack.pop();
		const winfo = f.wordinfo(xt);
		f.stack.push(winfo.dfa);
	}

	static picstart(f: Forth) {
		const { picbuf, toPicbuf } = ForthBuiltins;
		toPicbuf(picbuf);
	}

	static picend(f: Forth) {
		const { picbuf, toPicbuf } = ForthBuiltins;
		f.stack.popd();

		const len = picbuf - toPicbuf();
		f.stack.push(toPicbuf());
		f.stack.push(len);
	}

	static picdigit(f: Forth) {
		const { base, toPicbuf } = ForthBuiltins;

		const value = f.stack.popd();
		const offset = toPicbuf() - 1;
		const result = doPictureDigit(value, base());
		f.store8(offset, result.char);
		toPicbuf(offset);
		f.stack.pushd(result.value);
	}

	static picall(f: Forth) {
		const { base, toPicbuf } = ForthBuiltins;
		const b = base();
		var value = f.stack.popd();

		while (true) {
			const offset = toPicbuf() - 1;
			const result = doPictureDigit(value, b);
			f.store8(offset, result.char);
			toPicbuf(offset);

			value = result.value;
			if (!value) break;
		}

		f.stack.pushd(0);
	}

	static squote(f: Forth) {
		const state = ForthBuiltins.state();
		const result = scan(f, '"');
		if (typeof result === 'string') {
			f.debug('parsed:', result);

			if (state) {
				const xt = f.words['(sliteral)'];
				f.debug('compiling: (sliteral)', result);
				f.write(xt);
			}

			const addr = f.writeString(result);
			if (!state) {
				f.stack.push(addr);
				f.stack.push(result.length);
			}
			return;
		}

		// TODO
		f.options.output.type('invalid used of "\n');
	}

	static sliteralRt(f: Forth) {
		const length = f.fetch(f.ip);
		const addr = f.ip + f.options.cellsize;
		f.stack.push(addr);
		f.stack.push(length);
		f.ip += f.options.cellsize + length;
	}

	static cellp(f: Forth) {
		f.stack.push(f.stack.pop() + f.options.cellsize);
	}
	static cells(f: Forth) {
		f.stack.push(f.stack.pop() * f.options.cellsize);
	}

	static charp(f: Forth) {
		f.stack.push(f.stack.pop() + 1);
	}
	static chars() {}

	static seq(f: Forth) {
		const len2 = f.stack.pop();
		const addr2 = f.stack.pop();
		const len1 = f.stack.pop();
		const addr1 = f.stack.pop();

		if (len1 !== len2) f.stack.pushf(false);
		else {
			const str1 = f.readString(addr1, len1);
			const str2 = f.readString(addr2, len2);
			f.stack.pushf(str1 === str2);
		}
	}

	static hold(f: Forth) {
		const { toPicbuf } = ForthBuiltins;
		const char = f.stack.pop();
		const addr = toPicbuf() - 1;
		f.store8(addr, char);
		toPicbuf(addr);
	}

	static holds(f: Forth) {
		const { toPicbuf } = ForthBuiltins;
		const len = f.stack.pop();
		const src = f.stack.pop();
		const str = f.readString(src, len);
		const addr = toPicbuf() - len;
		for (var i = 0; i < len; i++) f.store8(addr + i, str.charCodeAt(i));
		toPicbuf(addr);
	}

	static picsign(f: Forth) {
		const { toPicbuf } = ForthBuiltins;
		const val = f.signed(f.stack.pop());
		if (val < 0) {
			const addr = toPicbuf() - 1;
			f.store8(addr, 45); // '-'
			toPicbuf(addr);
		}
	}

	static abort(f: Forth) {
		return f.throw(ForthException.abort, 'abort');
	}

	static aborts(f: Forth) {
		const result = scan(f, '"');
		if (typeof result === 'string') {
			f.debug('parsed:', result);
			return f.throw(ForthException.aborts, result);
		}

		// TODO
		f.options.output.type('invalid used of "\n');
	}

	static align(f: Forth) {
		f.here = aligned(f.here, f.options.cellsize);
	}

	static aligned(f: Forth) {
		const val = f.stack.pop();
		f.stack.push(aligned(val, f.options.cellsize));
	}

	static space(f: Forth) {
		f.options.output.emit(' ');
	}

	static spaces(f: Forth) {
		const amount = f.signed(f.stack.pop());
		for (var i = 0; i < amount; i++) f.options.output.emit(' ');
	}

	static fill(f: Forth) {
		const char = f.stack.pop();
		const len = f.signed(f.stack.pop());
		const addr = f.stack.pop();
		for (var i = 0; i < len; i++) f.store8(addr + i, char);
	}

	static max(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();
		f.stack.push(Math.max(n1, n2));
	}

	static min(f: Forth) {
		const n2 = f.stack.pop();
		const n1 = f.stack.pop();
		f.stack.push(Math.min(n1, n2));
	}

	static negate(f: Forth) {
		f.stack.push(-f.signed(f.stack.pop()));
	}

	static invert(f: Forth) {
		f.stack.push(~f.stack.pop());
	}

	static recurse(f: Forth) {
		const xt = f.link + f.options.cellsize;
		f.debug('compile:', f.wordinfo(xt).name);
		f.write(xt);
	}

	static setdebug(f: Forth) {
		const x = f.stack.pop();
		f.options.debug = x !== 0;
	}

	static begin(f: Forth) {
		f.cstack.push(f.here);
		f.debug('dest:', f.here);
	}

	static branch(f: Forth) {
		f.ip = f.fetch(f.ip);
	}

	static branch0(f: Forth) {
		const x = f.stack.pop();
		const dest = f.fetch(f.ip);
		if (x) f.ip += f.options.cellsize;
		else {
			// f.debug('branch0 passed test');
			f.ip = dest;
		}
	}

	// TODO: refactor to primitives
	static until(f: Forth) {
		const dest = f.cstack.pop();
		const xt = f.words['(branch0)'];
		f.debug('compile: (branch0)', dest);
		f.write(xt);
		f.write(dest);
	}

	// TODO: refactor to primitives
	static while(f: Forth) {
		const dest = f.cstack.pop();
		const xt = f.words['(branch0)'];
		f.debug('compile: (branch0)', '???');
		f.write(xt);
		const orig = f.here;
		f.write(-1);
		f.debug('orig:', orig);
		f.cstack.push(orig);
		// f.debug('dest:', dest);
		f.cstack.push(dest);
	}

	// TODO: refactor to primitives
	static repeat(f: Forth) {
		const dest = f.cstack.pop();
		const orig = f.cstack.pop();
		const xt = f.words['(branch)'];
		f.debug('compile: (branch)', dest);
		f.write(xt);
		f.write(dest);
		f.debug('resolve:', orig, f.here);
		f.store(orig, f.here);
	}

	// TODO: refactor to primitives
	static if(f: Forth) {
		const xt = f.words['(branch0)'];
		f.debug('compile: (branch0)', '???');
		f.write(xt);
		const orig = f.here;
		f.write(-1);
		f.debug('orig:', orig);
		f.cstack.push(orig);
	}

	// TODO: refactor to primitives
	static else(f: Forth) {
		const xt = f.words['(branch)'];
		f.debug('compile: (branch)', '???');
		f.write(xt);
		const orig = f.here;
		f.write(-1);
		const old = f.cstack.pop();
		f.debug('resolve:', old, f.here);
		f.store(old, f.here);
		f.debug('orig:', orig);
		f.cstack.push(orig);
	}

	// TODO: refactor to primitives
	static then(f: Forth) {
		const orig = f.cstack.pop();
		f.debug('resolve:', orig, f.here);
		f.store(orig, f.here);
	}

	static mul2(f: Forth) {
		const x = f.stack.pop();
		f.stack.push(x << 1);
	}
	static lshift(f: Forth) {
		const u = f.stack.pop();
		const x = f.stack.pop();
		f.stack.push(x << u);
	}

	static div2(f: Forth) {
		const x = f.stack.pop();
		f.stack.push(x >> 1);
	}
	static rshift(f: Forth) {
		const u = f.stack.pop();
		const x = f.stack.pop();
		f.stack.push(x >> u);
	}

	static envq(f: Forth) {
		const len = f.stack.pop();
		const addr = f.stack.pop();
		const str = f.readString(addr, len).toUpperCase();

		if (f.environment[str]) {
			f.environment[str].forEach(n => f.stack.push(n));
			f.stack.push(-1);
		} else f.stack.push(0);
	}

	static stod(f: Forth) {
		const x = f.signed(f.stack.top());
		f.stack.push(x < 0 ? -1 : 0);
	}

	// TODO: incorrect (see tests)
	static fmmod(f: Forth) {
		const n = f.signed(f.stack.pop());
		const d = f.signedd(f.stack.popd());

		if (n == 0) return f.throw(ForthException.divzero, 'division by zero');

		const div = Math.floor(d / n);
		const rem = d % n;
		f.stack.push(rem);
		f.stack.push(div);
	}

	static ummod(f: Forth) {
		const u = f.stack.pop();
		const ud = f.stack.popd();

		if (u == 0) return f.throw(ForthException.divzero, 'division by zero');

		const div = Math.floor(ud / u);
		const rem = ud % u;
		f.stack.push(rem);
		f.stack.push(div);
	}

	// TODO: incorrect (see tests)
	static smrem(f: Forth) {
		const n = f.signed(f.stack.pop());
		const d = f.signedd(f.stack.popd());

		if (n == 0) return f.throw(ForthException.divzero, 'division by zero');

		const div = Math.floor(d / n);
		const rem = d % n;
		f.stack.push(rem);
		f.stack.push(div);
	}

	static mmul(f: Forth) {
		const n2 = f.signed(f.stack.pop());
		const n1 = f.signed(f.stack.pop());
		const d = n1 * n2;
		f.stack.pushd(d);
	}
	static ummul(f: Forth) {
		const u2 = f.stack.pop();
		const u1 = f.stack.pop();
		const d = u1 * u2;
		f.stack.pushd(d);
	}

	static move(f: Forth) {
		const len = f.signed(f.stack.pop());
		const dst = f.stack.pop();
		const src = f.stack.pop();

		if (len > 0) {
			const data: number[] = [];
			for (var i = 0; i < len; i++) data.push(f.fetch8(src + i));
			for (var i = 0; i < len; i++) f.store8(dst + i, data[i]);
		}
	}

	static accept(f: Forth) {
		const maxlen = f.signed(f.stack.pop());
		const addr = f.stack.pop();

		if (maxlen <= 0) f.stack.push(0);
		else
			return new Promise<void>(async (resolve, reject) => {
				var i = 0;
				while (true) {
					const e = await f.options.input.key();
					if (e.key === 'Enter') {
						f.stack.push(i);
						return resolve();
					}

					f.store8(addr + i, e.code);
					i++;
					if (i >= maxlen) {
						f.stack.push(i);
						return resolve();
					}
				}
			});
	}

	static do(f: Forth) {
		const xt = f.words['(do)'];
		f.debug('compile: (do)');
		f.write(xt);

		f.cstack.push(f.here);
		f.debug('dest:', f.here);

		// number of LEAVEs
		// TODO: should this really use the data stack?
		f.stack.push(0);
	}

	static doRt(f: Forth) {
		const index = f.stack.pop();
		const limit = f.stack.pop();
		f.rstack.push(limit);
		f.rstack.push(index);
	}

	static loop(f: Forth) {
		const xt = f.words['(loop)'];
		f.debug('compile: (loop)');
		f.write(xt);

		const dest = f.cstack.pop();
		const xt2 = f.words['(branch0)'];
		f.debug('compile: (branch0)', dest);
		f.write(xt2);
		f.write(dest);

		ForthBuiltins.resolveLeave(f);
	}

	static leave(f: Forth) {
		const xt = f.words['2rdrop'];
		f.debug('compile: 2rdrop');
		f.write(xt);

		const xt2 = f.words['(branch)'];
		f.debug('compile: (branch)', '???');
		f.write(xt2);

		// TODO: should this really use the data stack?
		const count = f.stack.pop();
		f.stack.push(f.here);
		f.stack.push(count + 1);

		f.write(-1);
	}

	// TODO: should this really use the data stack?
	static resolveLeave(f: Forth) {
		const count = f.stack.pop();
		for (var i = 0; i < count; i++) {
			const orig = f.stack.pop();
			f.debug('resolve:', orig, f.here);
			f.store(orig, f.here);
		}
	}

	// TODO: this code kinda sucks
	static loopRt(f: Forth) {
		const orig = f.rstack.pop();
		const limit = f.rstack.top();
		f.rstack.push(orig + 1);
		const index = f.rstack.top();
		if (f.signed(index) === f.signed(limit)) {
			f.rstack.popd();
			f.stack.pushf(true);
		} else {
			f.stack.pushf(false);
		}
	}

	// TODO: resolve LEAVEs
	static addloop(f: Forth) {
		const xt = f.words['(+loop)'];
		f.debug('compile: (+loop)');
		f.write(xt);

		const dest = f.cstack.pop();
		const xt2 = f.words['(branch0)'];
		f.debug('compile: (branch0)', dest);
		f.write(xt2);
		f.write(dest);

		ForthBuiltins.resolveLeave(f);
	}

	// TODO: this code kinda sucks
	static addloopRt(f: Forth) {
		const step = f.stack.pop();
		const orig = f.rstack.pop();
		const limit = f.rstack.top();
		f.rstack.push(orig + step);
		const index = f.rstack.top();
		if (loopPassed(limit, index, f.signed(step), orig)) {
			f.rstack.popd();
			f.stack.pushf(true);
		} else {
			f.stack.pushf(false);
		}
	}

	static rdrop(f: Forth) {
		f.rstack.pop();
	}
	static rdrop2(f: Forth) {
		f.rstack.popd();
	}

	static find(f: Forth) {
		const caddr = f.stack.pop();
		const str = f.readString(caddr + f.options.cellsize, f.fetch(caddr));
		const xt = f.viswords[str.toLowerCase()];
		if (xt) {
			const winfo = f.wordinfo(xt);
			f.stack.push(xt);
			f.stack.push(winfo.flags & HeaderFlags.IsImmediate ? 1 : -1);
		} else {
			f.stack.push(caddr);
			f.stack.push(0);
		}
	}

	static word(f: Forth) {
		const x = f.stack.pop();
		const ch = String.fromCharCode(x);
		const result = scan(f, ch, '\n');
		const caddr = ForthBuiltins.wordbuf;
		if (result) f.writeStringAt(caddr, result.slice(0, f.options.wordsize));
		else f.writeStringAt(caddr, '');
		f.stack.push(caddr);
	}

	// TODO: can I reuse asNumber? this is much stricter
	static toNumber(f: Forth) {
		const { base } = ForthBuiltins;
		const len = f.stack.pop();
		const addr = f.stack.pop();
		var value = f.stack.popd();
		const src = f.readString(addr, len).toLowerCase();

		var i = 0;
		const available = numberChars.slice(0, base());
		for (; i < src.length; i++) {
			const ch = src[i];
			const j = available.indexOf(ch);

			if (j >= 0) value = value * base() + j;
			else break;
		}

		f.stack.pushd(value);
		f.stack.push(addr + i);
		f.stack.push(src.length - i);
	}

	static backslash(f: Forth) {
		scan(f, '\n');
	}
}
