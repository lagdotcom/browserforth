import GotInput from './GotInput';

export default interface Input {
	keyq: boolean;
	key(): Promise<GotInput>;
}
