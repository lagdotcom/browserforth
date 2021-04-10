import { expect } from 'chai';

import Forth from './Forth';

describe('forth standard tests', () => {
	async function t(...lines: [forth: string, ...outputs: number[]][]) {
		const f = new Forth({ exceptions: true });
		await f.initialise();

		for (var i = 0; i < lines.length; i++) {
			const [forth, ...outputs] = lines[i];
			await f.runString(forth);
			if (f.options.debug)
				console.log('expected:', outputs, 'got:', f.stack.contents);

			outputs
				.reverse()
				.forEach(o => expect(f.signed(f.stack.pop())).to.equal(o));
			expect(f.stack.contents.length).to.equal(0);
		}
	}

	it('supports <# # #s #>', async () =>
		await t(
			[': gp3 <# 1 0 # # #> s" 01" s= ;'],
			['gp3', -1],
			[': gp4 <# 1 0 #s #> s" 1" s= ;'],
			['gp4', -1]
		));

	it("supports ' and [']", async () =>
		t(
			[': gt1 123 ;'],
			["' gt1 execute", 123],
			[": gt2 ['] gt1 ;"],
			['gt2 execute', 123]
		));

	it('supports (', async () =>
		t(['( A comment)1234', 1234], [': pc1 ( A comment)1234 ; pc1', 1234]));

	it('supports *', async () =>
		t(
			['0 0 *', 0],
			['0 1 *', 0],
			['1 0 *', 0],
			['1 2 *', 2],
			['2 1 *', 2],
			['3 3 *', 9],
			['-3 3 *', -9],
			['3 -3 *', -9],
			['-3 -3 *', 9]
			// ['mid-uint+1 1 rshift 2 *', 'mid-uint+1'],
			// ['mid-uint+1 2 rshift 4 *', 'mid-uint+1'],
			// ['mid-uint+1 1 rshift mid-uint+1 or 2 *', 'mid-uint+1']
		));

	it('supports , 2@ 2! cell+', async () =>
		await t(
			['here 1 , here 2 , constant 2nd constant 1st'],
			['1st 2nd u<', -1],
			['1st cell+ 2nd =', -1],
			['1st 1 cells + 2nd =', -1],
			['1st @ 2nd @', 1, 2],
			['5 1st !'],
			['1st @ 2nd @', 5, 2],
			['6 2nd !'],
			['1st @ 2nd @', 5, 6],
			['1st 2@', 6, 5],
			['2 1 1st 2!'],
			['1st 2@', 2, 1]
			// ['1s 1st ! 1st @ 1s =', -1]
		));

	it('supports 2*', async () =>
		await t(
			['0 2*', 0],
			['1 2*', 2],
			['hex 4000 2*', -0x8000]
			// ['1s 2* 1 xor', '1s'],
			// ['msb 2*', '0s']
		));

	it('supports 2/', async () =>
		await t(
			['0 2/', 0],
			['1 2/', 0],
			['hex 4000 2/', 0x2000]
			// ['1s 2/', '1s'],
			// ['1s 1 xor 2/', '1s'],
			// ['msb 2/ msb and', 'msb'],
		));

	it('supports 2over', async () => t(['1 2 3 4 2over', 1, 2, 3, 4, 1, 2]));

	it('supports abs', async () =>
		await t(
			['0 abs', 0],
			['1 abs', 1],
			['-1 abs', 1]
			// ['min-int abs', 'mid-uint+1'],
		));

	it('supports base', async () =>
		await t(
			[': gn2 base @ >r hex base @ decimal base @ r> base ! ;'],
			['gn2', 16, 10]
		));

	it('supports bl', async () => await t(['bl', 32]));

	it('supports constant', async () =>
		await t(
			['123 constant x123'],
			['x123', 123],
			[': equ constant ;'],
			['x123 equ y123'],
			['y123', 123]
		));

	it('supports does>', async () =>
		await t(
			[': does1 does> @ 1 + ;'],
			[': does2 does> @ 2 + ;'],
			['create cr1'],
			['cr1 here =', -1],
			['1 ,'],
			['cr1 @', 1],
			['does1'],
			['cr1', 2],
			['does2'],
			['cr1', 3],
			[': weird: create does> 1 + does> 2 + ;'],
			['weird: w1'],
			["' w1 >body here =", -1],
			['w1 here 1 + =', -1],
			['w1 here 2 + =', -1]
		));

	it('supports fill', async () =>
		await t(
			['3 buffer: fbuf'],
			[': seebuf fbuf c@ fbuf 1+ c@ fbuf 1+ 1+ c@ ;'],
			['fbuf 0 20 fill seebuf', 0, 0, 0],
			['fbuf 1 20 fill seebuf', 20, 0, 0],
			['fbuf 3 30 fill seebuf', 30, 30, 30]
		));

	it('supports hold', async () =>
		await t([': gp1 <# 65 hold 66 hold 0 0 #> s" BA" s= ;'], ['gp1', -1]));

	it('supports holds', async () =>
		await t(['<# 123 0 #s s" Number: " holds #> s" Number: 123" s=', -1]));

	it('supports if', async () =>
		await t(
			[': gi1 if 123 then ;'],
			[': gi2 if 123 else 234 then ;'],
			['0 gi1'],
			['1 gi1', 123],
			['-1 gi1', 123],
			['0 gi2', 234],
			['1 gi2', 123],
			['-1 gi2', 123],

			[': melse if 1 else 2 else 3 else 4 else 5 then ;'],
			['0 melse', 2, 4],
			['1 melse', 1, 3, 5]
		));

	it('supports invert', async () =>
		await t(['0 invert', -1], ['-1 invert', 0]));

	it('supports lshift', async () =>
		t(
			['hex 1 0 lshift', 1],
			['1 1 lshift', 2],
			['1 2 lshift', 4],
			['1 f lshift', -0x8000]
			// ['1s 1 lshift 1 xor', '1s'],
			// ['msb 1 lshift', 0]
		));

	it('supports negate', async () =>
		await t(
			['0 negate', 0],
			['1 negate', -1],
			['-1 negate', 1],
			['2 negate', -2],
			['-2 negate', 2]
		));

	it('supports rshift', async () =>
		t(
			['hex 1 0 rshift', 1],
			['1 1 rshift', 0],
			['2 1 rshift', 1],
			['4 2 rshift', 1],
			['8000 f rshift', 1]
			// ['msb 1 rshift msb and', 0],
			// ['msb 1 rshift 2*', 'msb']
		));

	it('supports s"', async () =>
		await t(
			[': gc4 s" XY" ;'],
			['gc4 swap drop', 2],
			['gc4 drop dup c@ swap char+ c@', 88, 89],
			[': gc5 s" A string"2drop ;'],
			['gc5']
		));

	it('supports sign', async () =>
		await t(['<# -1 sign 0 sign -1 sign 0 0 #> s" --" s=', -1]));

	it('supports state', async () =>
		await t(
			[': gt8 state @ ; immediate'],
			['gt8', 0],
			[': gt9 gt8 literal ;'],
			['gt9 0=', 0]
		));

	it('supports variable', async () =>
		await t(['variable v1'], ['123 v1 !'], ['v1 @', 123]));

	it('supports while', async () =>
		await t(
			[': gi3 begin dup 5 < while dup 1+ repeat ;'],
			['0 gi3', 0, 1, 2, 3, 4, 5],
			['4 gi3', 4, 5],
			['5 gi3', 5],
			['6 gi3', 6],

			[
				': gi5 begin dup 2 > while dup 5 < while dup 1+ repeat 123 else 345 then ;',
			],
			['1 gi5', 1, 345],
			['2 gi5', 2, 345],
			['3 gi5', 3, 4, 5, 123],
			['4 gi5', 4, 5, 123],
			['5 gi5', 5, 123]
		));

	it('supports >body', async () =>
		await t(['create cr0'], ["' cr0 >body here =", -1]));
});
