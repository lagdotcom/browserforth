export interface InputData {
	code: number;
	key: string;
}

export default interface Input {
	close(): void;
	keyq: boolean;
	key(): Promise<InputData>;
}
