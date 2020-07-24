import Forth from './Forth';
import ForthBuiltins from './ForthBuiltins';
import { expect } from 'chai';

describe('forth builtins', () => {
	it('should dup', () => {
		const f = new Forth();
		f.stack.push(10);
		ForthBuiltins.dup(f);
		expect(f.stack.pop()).to.equal(10);
		expect(f.stack.pop()).to.equal(10);
	});

	it('should drop', () => {
		const f = new Forth();
		f.stack.push(10);
		f.stack.push(20);
		ForthBuiltins.drop(f);
		expect(f.stack.pop()).to.equal(10);
	});

	it('should add', () => {
		const f = new Forth();
		f.stack.push(2);
		f.stack.push(3);
		ForthBuiltins.add(f);
		expect(f.stack.pop()).to.equal(5);

		f.stack.push(-2);
		f.stack.push(-3);
		ForthBuiltins.add(f);
		expect(f.signed(f.stack.pop())).to.equal(-5);
	});

	it('should subtract', () => {
		const f = new Forth();
		f.stack.push(5);
		f.stack.push(3);
		ForthBuiltins.sub(f);
		expect(f.stack.pop()).to.equal(2);

		f.stack.push(-4);
		f.stack.push(-8);
		ForthBuiltins.sub(f);
		expect(f.stack.pop()).to.equal(4);
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
