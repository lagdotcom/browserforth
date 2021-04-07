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

	it('supports state', async () =>
		await t(
			[': gt8 state @ ; immediate'],
			['gt8', 0],
			[': gt9 gt8 literal ;'],
			['gt9 0=', 0]
		));
});
