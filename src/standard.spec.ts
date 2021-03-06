import { expect } from 'chai';

import Forth from './Forth';

describe('forth standard tests', () => {
	const cellsize = 2;
	async function t(...lines: [forth: string, ...outputs: number[]][]) {
		const f = new Forth({ exceptions: true, cellsize });
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

	const T = -1;
	const F = 0;

	it('supports <# # #s #>', async () =>
		await t(
			[': gp3 <# 1 0 # # #> s" 01" s= ;'],
			['gp3', T],
			[': gp4 <# 1 0 #s #> s" 1" s= ;'],
			['gp4', T]
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

	it('supports +!', async () =>
		await t(
			['here 0 , constant 1st'],
			['1 1st +!'],
			['1st @', 1],
			['-1 1st +! 1st @', 0]
		));

	it('supports , 2@ 2! cell+', async () =>
		await t(
			['here 1 , here 2 , constant 2nd constant 1st'],
			['1st 2nd u<', T],
			['1st cell+ 2nd =', T],
			['1st 1 cells + 2nd =', T],
			['1st @ 2nd @', 1, 2],
			['5 1st !'],
			['1st @ 2nd @', 5, 2],
			['6 2nd !'],
			['1st @ 2nd @', 5, 6],
			['1st 2@', 6, 5],
			['2 1 1st 2!'],
			['1st 2@', 2, 1]
			// ['1s 1st ! 1st @ 1s =', T]
		));

	it('supports 2*', async () =>
		await t(
			['0 2*', 0],
			['1 2*', 2],
			['hex 4000 2* 8000 =', T]
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

	it('supports 2literal', async () =>
		t(
			[': cd1 [ -1. ] 2literal ;'],
			['cd1', -1, -1],
			['2variable 2v4 immediate 5 6 2v4 2!'],
			[': cd7 2v4 [ 2@ ] 2literal ; cd7', 5, 6],
			[': cd8 [ 6 7 ] 2v4 [ 2! ] ; 2v4 2@', 6, 7]
		));

	it('supports 2variable', async () =>
		t(
			['2variable 2v1'],
			['0. 2v1 2!'],
			['   2v1 2@', 0, 0],
			['-1 -2 2v1 2!'],
			['      2v1 2@', -1, -2],
			[': cd2 2variable ;'],
			['cd2 2v2'],
			[': cd3 2v2 2! ;'],
			['-2 -1 cd3'],
			['2v2 2@', -2, -1],
			['2variable 2v3 immediate 5 6 2v3 2!'],
			['2v3 2@', 5, 6]
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

	it('supports d=', async () =>
		await t(
			['-1. -1. d=', T],
			['-1.  0. d=', F],
			['-1.  1. d=', F],
			[' 0. -1. d=', F],
			[' 0.  0. d=', T],
			[' 0.  1. d=', F],
			[' 1. -1. d=', F],
			[' 1.  0. d=', F],
			[' 1.  1. d=', T]
		));

	it('supports do i j loop +loop', async () =>
		await t(
			[': gd1 do i                 loop ;'],
			[' 4  1 gd1', 1, 2, 3],
			[' 2 -1 gd1', -1, 0, 1],
			[': gd2 do i             -1 +loop ;'],
			[' 1  4 gd2', 4, 3, 2, 1],
			['-1  2 gd2', 2, 1, 0, -1],
			[': gd3 do 1 0 do j loop     loop ;'],
			[' 4  1 gd3', 1, 2, 3],
			[' 2 -1 gd3', -1, 0, 1],
			[': gd4 do 1 0 do j loop -1 +loop ;'],
			[' 1  4 gd4', 4, 3, 2, 1],
			['-1  2 gd4', 2, 1, 0, -1]
		));

	it('supports does>', async () =>
		await t(
			[': does1 does> @ 1 + ;'],
			[': does2 does> @ 2 + ;'],
			['create cr1'],
			['cr1 here =', T],
			['1 ,'],
			['cr1 @', 1],
			['does1'],
			['cr1', 2],
			['does2'],
			['cr1', 3],
			[': weird: create does> 1 + does> 2 + ;'],
			['weird: w1'],
			["' w1 >body here =", T],
			['w1 here 1 + =', T],
			['w1 here 2 + =', T]
		));

	it('supports fill move', async () =>
		await t(
			['3 buffer: fbuf'],
			[': seebuf fbuf c@ fbuf 1+ c@ fbuf 1+ 1+ c@ ;'],
			['fbuf 0 20 fill seebuf', 0, 0, 0],
			['fbuf 1 20 fill seebuf', 20, 0, 0],
			['fbuf 3 30 fill seebuf', 30, 30, 30],
			['create sbuf 12 c, 34 c, 56 c,'],
			['fbuf fbuf 3 chars move seebuf', 30, 30, 30],
			['sbuf fbuf 0 chars move seebuf', 30, 30, 30],
			['sbuf fbuf 1 chars move seebuf', 12, 30, 30],
			['sbuf fbuf 3 chars move seebuf', 12, 34, 56],
			['fbuf fbuf char+ 2 chars move seebuf', 12, 12, 34],
			['fbuf char+ fbuf 2 chars move seebuf', 12, 34, 34]
		));

	it('supports find', async () =>
		await t(
			[': gt1 ; : gt2 ; immediate'],
			['here 3 , char g c, char t c, char 1 c, constant gt1string'],
			['here 3 , char g c, char t c, char 2 c, constant gt2string'],
			["gt1string find swap ' gt1 =", -1, T],
			["gt2string find swap ' gt2 =", 1, T]
		));

	it('supports fm/mod', async () =>
		await t(
			[' 0 s>d  1 fm/mod', 0, 0],
			[' 1 s>d  1 fm/mod', 0, 1],
			[' 2 s>d  1 fm/mod', 0, 2],
			['-1 s>d  1 fm/mod', 0, -1],
			['-2 s>d  1 fm/mod', 0, -2],
			[' 0 s>d -1 fm/mod', 0, 0],
			[' 1 s>d -1 fm/mod', 0, -1],
			[' 2 s>d -1 fm/mod', 0, -2],
			['-1 s>d -1 fm/mod', 0, 1],
			['-2 s>d -1 fm/mod', 0, 2],
			[' 2 s>d  2 fm/mod', 0, 1],
			['-2 s>d -2 fm/mod', 0, 1],
			[' 7 s>d  3 fm/mod', 1, 2],
			[' 7 s>d -3 fm/mod', -2, -3],
			['-7 s>d  3 fm/mod', 2, -3],
			['-7 s>d -3 fm/mod', -1, 2]
		));

	it('supports hold', async () =>
		await t([': gp1 <# 65 hold 66 hold 0 0 #> s" BA" s= ;'], ['gp1', T]));

	it('supports holds', async () =>
		await t(['<# 123 0 #s s" Number: " holds #> s" Number: 123" s=', T]));

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

	it('supports leave', async () =>
		await t(
			[': gd5 123 swap 0 do i 4 > if drop 234 leave then loop ;'],
			['1 gd5', 123],
			['5 gd5', 123],
			['6 gd5', 234]
		));

	it('supports lshift', async () =>
		t(
			['hex 1 0 lshift', 1],
			['1 1 lshift', 2],
			['1 2 lshift', 4],
			['1 f lshift 8000 =', T]
			// ['1s 1 lshift 1 xor', '1s'],
			// ['msb 1 lshift', 0]
		));

	it('supports m*', async () =>
		await t(
			[' 0  0 m* drop', 0],
			[' 0  1 m* drop', 0],
			[' 1  0 m* drop', 0],
			[' 1  2 m* drop', 2],
			[' 2  1 m* drop', 2],
			[' 3  3 m* drop', 9],
			['-3  3 m* drop', -9],
			[' 3 -3 m* drop', -9],
			['-3 -3 m* drop', 9]
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

	it('supports s>d', async () =>
		await t(
			['0 s>d', 0, 0],
			['1 s>d', 1, 0],
			['2 s>d', 2, 0],
			['-1 s>d', -1, -1],
			['-2 s>d', -2, -1]
			// ['min-int s>d', 'min-int', -1],
			// ['max-int s>d', 'max-int', 0]
		));

	it('supports sign', async () =>
		await t(['<# -1 sign 0 sign -1 sign 0 0 #> s" --" s=', T]));

	it('supports sm/rem', async () =>
		await t(
			[' 0 s>d  1 sm/rem', 0, 0],
			[' 1 s>d  1 sm/rem', 0, 1],
			[' 2 s>d  1 sm/rem', 0, 2],
			['-1 s>d  1 sm/rem', 0, -1],
			['-2 s>d  1 sm/rem', 0, -2],
			[' 0 s>d -1 sm/rem', 0, 0],
			[' 1 s>d -1 sm/rem', 0, -1],
			[' 2 s>d -1 sm/rem', 0, -2],
			['-1 s>d -1 sm/rem', 0, 1],
			['-2 s>d -1 sm/rem', 0, 2],
			[' 2 s>d  2 sm/rem', 0, 1],
			['-2 s>d -2 sm/rem', 0, 1],
			[' 7 s>d  3 sm/rem', 1, 2],
			[' 7 s>d -3 sm/rem', 1, -2],
			['-7 s>d  3 sm/rem', -1, -2],
			['-7 s>d -3 sm/rem', -1, 2]
		));

	it('supports state', async () =>
		await t(
			[': gt8 state @ ; immediate'],
			['gt8', 0],
			[': gt9 gt8 literal ;'],
			['gt9 0=', 0]
		));

	it('supports um/mod', async () =>
		await t(
			['0 0 1 um/mod', 0, 0],
			['1 0 1 um/mod', 0, 1],
			['1 0 2 um/mod', 1, 0],
			['3 0 2 um/mod', 1, 1]
		));

	it('supports um*', async () =>
		await t(
			['0 0 um*', 0, 0],
			['0 1 um*', 0, 0],
			['1 0 um*', 0, 0],
			['1 2 um*', 2, 0],
			['2 1 um*', 2, 0],
			['3 3 um*', 9, 0]
		));

	it('supports unloop', async () =>
		await t(
			[
				': gd6 0 swap 0 do i 1+ 0 do i j + 3 = if i unloop i unloop exit then 1+ loop loop ;',
			],
			['1 gd6', 1],
			['2 gd6', 3],
			['3 gd6', 4, 1, 2]
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

	it('supports word', async () =>
		await t(
			[': gs3 word count swap c@ ;'],
			['bl gs3 hello', 5, 'h'.charCodeAt(0)],
			['char " gs3 goodbye"', 7, 'g'.charCodeAt(0)],
			['bl gs3 \ndrop', 0]
		));

	it('supports >body', async () =>
		await t(['create cr0'], ["' cr0 >body here =", T]));

	it('supports >number', async () =>
		await t(
			['create gn-buf 0 c,'],
			[': gn-string gn-buf 1 ;'],
			[': ok? gn-buf char+ 0 d= ;'],
			[": gn' [char] ' word cell+ c@ gn-buf c! gn-string ;"],
			["0 0 gn' 0'    >number       ok?", 0, 0, T],
			["0 0 gn' 1'    >number       ok?", 1, 0, T],
			["1 0 gn' 1'    >number       ok?", 11, 0, T],
			["0 0 gn' -'    >number       ok?", 0, 0, F],
			["0 0 gn' +'    >number       ok?", 0, 0, F],
			["0 0 gn' .'    >number       ok?", 0, 0, F],
			[': >number-based base @ >r base ! >number r> base ! ;'],
			["0 0 gn' 2' 16 >number-based ok?", 2, 0, T],
			["0 0 gn' 2'  2 >number-based ok?", 0, 0, F],
			["0 0 gn' F' 16 >number-based ok?", 15, 0, T],
			["0 0 gn' G' 16 >number-based ok?", 0, 0, F],
			["0 0 gn' G' 36 >number-based ok?", 16, 0, T],
			["0 0 gn' z' 36 >number-based ok?", 35, 0, T]
		));
});
