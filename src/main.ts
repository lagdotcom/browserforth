import Forth from './Forth';
import CanvasOutput from './output/CanvasOutput';
import DocumentInput from './input/DocumentInput';

window.addEventListener('load', () => {
	const output = new CanvasOutput();
	const input = new DocumentInput();

	const f = new Forth({
		debug: true,
		input,
		output,
	});
	console.log(f);

	(window as any).f = f;
});
