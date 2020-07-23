import Forth from './forth';
import { ForthBuiltins } from './builtins';
import { expect } from 'chai';

describe('forth builtins', () => {
	it('should dup', () => {
		const f = new Forth();
		f.push(10);
		ForthBuiltins.dup(f);
		expect(f.pop()).to.equal(10);
		expect(f.pop()).to.equal(10);
	});

	it('should drop', () => {
		const f = new Forth();
		f.push(10);
		f.push(20);
		ForthBuiltins.drop(f);
		expect(f.pop()).to.equal(10);
	});

	it('should add', () => {
		const f = new Forth();
		f.push(2);
		f.push(3);
		ForthBuiltins.add(f);
		expect(f.pop()).to.equal(5);

		// f.push(-2);
		// f.push(-3);
		// ForthBuiltins.add(f);
		// expect(f.pop()).to.equal(-5); // TODO: figure out signed ints
	});

	it('should subtract', () => {
		const f = new Forth();
		f.push(5);
		f.push(3);
		ForthBuiltins.sub(f);
		expect(f.pop()).to.equal(2);

		f.push(-4);
		f.push(-8);
		ForthBuiltins.sub(f);
		expect(f.pop()).to.equal(4);
	});
});
