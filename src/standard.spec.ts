import { expect } from 'chai';

import Forth from './Forth';

describe('forth standard tests', () => {
	async function t(...lines: [forth: string, ...outputs: number[]][]) {
		const f = new Forth({ exceptions: true });
		await f.initialise();

		for (var i = 0; i < lines.length; i++) {
			const [forth, ...outputs] = lines[i];
			await f.runString(forth);
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

	it('supports hold', async () =>
		await t([': gp1 <# 65 hold 66 hold 0 0 #> s" BA" s= ;'], ['gp1', -1]));

	it('supports holds', async () =>
		await t(['<# 123 0 #s s" Number: " holds #> s" Number: 123" s=', -1]));

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

	it('supports >body', async () =>
		await t(['create cr0'], ["' cr0 >body here =", -1]));
});
