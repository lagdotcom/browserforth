import wordlists from './compatWordlists';
import Forth from './src/Forth';

type Wordlist = keyof typeof wordlists;

function stats(f: Forth, name: Wordlist) {
	const list = wordlists[name];
	const missing: string[] = [];
	var found = 0;
	list.forEach(word => {
		if (f.words[word]) found++;
		else missing.push(word);
	});

	const perc = (found * 100) / list.length;
	return { found, max: list.length, perc, missing };
}

const f = new Forth({ libraries: ['exceptions'] });
f.initialise().then(() => {
	Object.keys(wordlists).forEach(name => {
		const { found, max, perc, missing } = stats(f, name as Wordlist);
		var line = `${name}: ${found}/${max} (${perc.toFixed(0)}%)`;
		if (missing.length) line += ', missing: ' + missing.join(' ');
		console.log(line);
	});
});
