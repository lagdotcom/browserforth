import Input from './Input';

export default class DocumentInput implements Input {
	el: HTMLDivElement;
	events: KeyboardEvent[];
	promises: ((e: KeyboardEvent) => void)[];

	constructor() {
		this.events = [];
		this.promises = [];

		this.el = document.createElement('div');
		document.body.append(this.el);

		document.addEventListener('keypress', e => {
			const p = this.promises.shift();
			if (p) p(e);
			else this.events.push(e);

			this.status();
		});

		this.status();
	}

	get keyq() {
		return this.events.length > 0;
	}

	key() {
		if (this.keyq) {
			const e = this.events.shift() as KeyboardEvent;
			this.status();
			return Promise.resolve(e);
		}

		return new Promise<KeyboardEvent>(resolve => {
			this.promises.push(resolve);
			this.status();
		});
	}

	private status() {
		this.el.textContent = `${this.events.length} keys in buffer, ${this.promises.length} words waiting for input`;
	}
}
