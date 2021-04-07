import { expect } from 'chai';

import Forth, { ForthBuiltin } from './Forth';
import ForthBuiltins from './ForthBuiltins';

describe('forth builtins', () => {
	function stackTest(fn: ForthBuiltin, inputs: number[], outputs: number[]) {
		const f = new Forth();
		inputs.forEach(i => f.stack.push(i));
		fn(f);
		outputs.reverse().forEach(o => expect(f.signed(f.stack.pop())).to.equal(o));
		expect(f.stack.contents.length).to.equal(0);
	}

	it('should dup', () => {
		stackTest(ForthBuiltins.dup, [1], [1, 1]);
	});

	it('should ?dup', () => {
		stackTest(ForthBuiltins.qdup, [-1], [-1, -1]);
		stackTest(ForthBuiltins.qdup, [0], [0]);
		stackTest(ForthBuiltins.qdup, [1], [1, 1]);
	});

	it('should drop', () => {
		stackTest(ForthBuiltins.drop, [1, 2], [1]);
		stackTest(ForthBuiltins.drop, [0], []);
	});

	it('should add', () => {
		stackTest(ForthBuiltins.add, [0, 5], [5]);
		stackTest(ForthBuiltins.add, [5, 0], [5]);
		stackTest(ForthBuiltins.add, [0, -5], [-5]);
		stackTest(ForthBuiltins.add, [-5, 0], [-5]);
		stackTest(ForthBuiltins.add, [1, 2], [3]);
		stackTest(ForthBuiltins.add, [1, -2], [-1]);
		stackTest(ForthBuiltins.add, [-1, 2], [1]);
		stackTest(ForthBuiltins.add, [-1, -2], [-3]);
		stackTest(ForthBuiltins.add, [-1, 1], [0]);
	});

	it('should subtract', () => {
		stackTest(ForthBuiltins.sub, [0, 5], [-5]);
		stackTest(ForthBuiltins.sub, [5, 0], [5]);
		stackTest(ForthBuiltins.sub, [0, -5], [5]);
		stackTest(ForthBuiltins.sub, [-5, 0], [-5]);
		stackTest(ForthBuiltins.sub, [1, 2], [-1]);
		stackTest(ForthBuiltins.sub, [1, -2], [3]);
		stackTest(ForthBuiltins.sub, [-1, 2], [-3]);
		stackTest(ForthBuiltins.sub, [-1, -2], [1]);
		stackTest(ForthBuiltins.sub, [0, 1], [-1]);
	});

	it('should do >r r@ r>', () => {
		const f = new Forth();
		f.stack.push(10);
		ForthBuiltins.tor(f);
		ForthBuiltins.rpeek(f);
		ForthBuiltins.fromr(f);
		expect(f.stack.pop()).to.equal(10);
		expect(f.stack.pop()).to.equal(10);
		expect(f.rstack.contents.length).to.equal(0);
	});
});
