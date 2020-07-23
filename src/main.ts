import Forth from './forth';

window.addEventListener('load', () => {
	const f = new Forth();
	console.log(f);

	(window as any).f = f;
});
