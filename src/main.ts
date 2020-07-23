import Forth from './forth';
import CanvasOutput from './output/CanvasOutput';

window.addEventListener('load', () => {
	const f = new Forth({ debug: true, output: new CanvasOutput() });
	console.log(f);

	(window as any).f = f;
});
