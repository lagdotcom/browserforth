import Forth from './Forth';
import ForthBuiltins from './ForthBuiltins';
import DocumentInput from './input/DocumentInput';
import CanvasOutput from './output/CanvasOutput';

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
	(window as any).fb = ForthBuiltins;
});
