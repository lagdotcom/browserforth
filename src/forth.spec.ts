import Forth from './forth';

describe('forth system', () => {
	it('should allow 16 or 32 bit forths', () => {
		new Forth({ cellsize: 2, memory: 100 });
		new Forth({ cellsize: 4, memory: 100 });
	});
});
