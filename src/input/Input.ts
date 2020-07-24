export default interface Input {
	keyq: boolean;
	key(): Promise<KeyboardEvent>;
}
