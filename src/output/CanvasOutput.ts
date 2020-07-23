import Output from './Output';

const consoleColours = [
	'transparent',
	'#ff0000',
	'#00ff00',
	'#ffff00',
	'#0000ff',
	'#ff00ff',
	'#00ffff',
	'#cccccc',
	'#444444',
	'#ff8888',
	'#88ff88',
	'#ffff88',
	'#8888ff',
	'#ff88ff',
	'#88ffff',
	'#ffffff',
	'#000000',
];

interface CanvasOptions {
	fontsize: number;
	fontfamily: string;
	cellw: number;
	cellh: number;
	width: number;
	height: number;
}

export default class CanvasOutput implements Output {
	bg: string;
	cols: number;
	ctx: CanvasRenderingContext2D;
	el: HTMLCanvasElement;
	fg: string;
	options: CanvasOptions;
	rows: number;
	tx: number;
	ty: number;

	constructor(options: Partial<CanvasOptions> = {}) {
		this.options = {
			width: options.width || 960,
			height: options.height || 400,
			fontsize: options.fontsize || 14,
			fontfamily: options.fontfamily || 'monospace',
			cellw: options.cellw || 12,
			cellh: options.cellh || 16,
		};
		this.cols = Math.floor(this.options.width / this.options.cellw);
		this.rows = Math.floor(this.options.height / this.options.cellh);

		this.el = document.createElement('canvas');
		this.el.width = this.options.width;
		this.el.height = this.options.height;

		const ctx = this.el.getContext('2d');
		if (!ctx) throw new Error('Could not create canvas context');
		this.ctx = ctx;

		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, this.options.width, this.options.height);
		document.body.append(this.el);

		ctx.font = `${this.options.fontsize}px ${this.options.fontfamily}`;

		this.bg = consoleColours[0];
		this.fg = consoleColours[7];
		this.tx = 0;
		this.ty = 0;
	}

	emit(ch: string) {
		this.charat(this.tx, this.ty, ch, this.fg, this.bg);
		this.tx++;
		if (this.tx >= this.cols) {
			this.tx = 0;
			this.ty++;
		}
	}

	goto(x: number, y: number) {
		this.tx = x;
		this.ty = y;
	}

	type(str: string) {
		for (var i = 0; i < str.length; i++) {
			const ch = str[i];

			if (ch === '\n') {
				this.tx = 0;
				this.ty++;
				continue;
			}

			// TODO: ANSI etc.
			this.emit(ch);
		}
	}

	private charat(tx: number, ty: number, ch: string, fg: string, bg: string) {
		const { ctx, options } = this;
		const { cellw, cellh } = options;
		const x = tx * cellw,
			y = ty * cellh;

		if (bg !== 'transparent') {
			ctx.fillStyle = bg;
			ctx.fillRect(x, y, x + cellw, y + cellh);
		}
		// ctx.strokeStyle = fg;
		// ctx.strokeRect(x, y, cellw, cellh);

		ctx.fillStyle = fg;
		ctx.fillText(ch, x, y + this.options.fontsize);
	}
}
