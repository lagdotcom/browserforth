import Input, { InputData } from './Input';

export default class DocumentInput implements Input {
	el: HTMLDivElement;
	events: InputData[];
	promises: ((e: InputData) => void)[];

	constructor() {
		this.events = [];
		this.promises = [];

		this.el = document.createElement('div');
		document.body.append(this.el);

		document.addEventListener('keypress', kp => {
			const e = this.toEvent(kp);
			const p = this.promises.shift();
			if (p) p(e);
			else this.events.push(e);

			this.status();
		});

		this.status();
	}

	close() {}

	get keyq() {
		return this.events.length > 0;
	}

	key() {
		if (this.keyq) {
			const e = this.events.shift() as InputData;
			this.status();
			return Promise.resolve(e);
		}

		return new Promise<InputData>(resolve => {
			this.promises.push(resolve);
			this.status();
		});
	}

	private status() {
		this.el.textContent = `${this.events.length} keys in buffer, ${this.promises.length} words waiting for input`;
	}

	private toEvent(kp: KeyboardEvent): InputData {
		// TODO: deprecated
		const e = { key: kp.key, code: kp.charCode };
		// console.log('toEvent', e);
		return e;
	}
}
