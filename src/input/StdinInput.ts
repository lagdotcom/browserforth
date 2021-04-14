import GotInput from './GotInput';
import Input from './Input';

export default class StdinInput implements Input {
	buffer: GotInput[];
	promises: ((e: GotInput) => void)[];

	constructor() {
		this.buffer = [];
		this.promises = [];

		process.stdin.setEncoding('ascii');
		process.stdin.on('readable', () => {
			while (true) {
				const byte = process.stdin.read(1);
				if (byte === null) break;

				const e = this.toEvent(byte);
				const p = this.promises.shift();
				if (p) p(e);
				else this.buffer.push(e);
			}
		});
	}

	get keyq() {
		return this.buffer.length > 0;
	}

	key() {
		if (this.keyq) {
			const key = this.buffer.shift() as GotInput;
			return Promise.resolve(key);
		}

		return new Promise<GotInput>(resolve => {
			this.promises.push(resolve);
		});
	}

	private toEvent(key: string): GotInput {
		const e = { key, code: key.charCodeAt(0) };
		// console.log('toEvent', e);
		return e;
	}
}
