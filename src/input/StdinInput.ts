import Input, { InputData } from './Input';

export default class StdinInput implements Input {
	buffer: InputData[];
	promises: ((e: InputData) => void)[];
	ready: () => void;

	constructor() {
		this.buffer = [];
		this.promises = [];

		this.ready = () => {
			while (true) {
				const byte = process.stdin.read(1);
				if (byte === null) break;

				const e = this.toEvent(byte);
				const p = this.promises.shift();
				if (p) p(e);
				else this.buffer.push(e);
			}
		};

		process.stdin.setEncoding('ascii');
		process.stdin.on('readable', this.ready);
	}

	get keyq() {
		return this.buffer.length > 0;
	}

	key() {
		if (this.keyq) {
			const key = this.buffer.shift() as InputData;
			return Promise.resolve(key);
		}

		return new Promise<InputData>(resolve => {
			this.promises.push(resolve);
		});
	}

	close() {
		process.stdin.off('readable', this.ready);
		this.promises.forEach(p => p({ key: '', code: 0 }));
		this.promises = [];
	}

	private toEvent(key: string): InputData {
		const e = { key, code: key.charCodeAt(0) };
		// console.log('toEvent', e);
		return e;
	}
}
