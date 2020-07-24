import Input from './Input';

export default class NullInput implements Input {
	get keyq() {
		return false;
	}

	async key() {
		return Promise.reject();
	}
}
