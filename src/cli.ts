import Forth from './Forth';
import StdinInput from './input/StdinInput';
import StdoutOutput from './output/StdoutOutput';

const input = new StdinInput();
const output = new StdoutOutput();
const f = new Forth({ input, output });
f.initialise().then(async () => {
	// TODO: replace with QUIT
	var buffer = '';

	output.type('> ');
	while (true) {
		const { key } = await input.key();
		if (key === '\r' || key === '\n') {
			if (buffer.toLowerCase() === 'quit') {
				input.close();

				// TODO: fix this lol
				output.type('(hit enter again)');
				return;
			}

			if (buffer) {
				await f.runString(buffer);
				buffer = '';
				output.type('\n> ');
			}
		} else buffer += key;
	}
});
