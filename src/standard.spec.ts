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

	it('supports abs', async () =>
		await t(
			['0 abs', 0],
			['1 abs', 1],
			['-1 abs', 1]
			// TODO: ['min-int abs', 'mid-uint+1'],
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
