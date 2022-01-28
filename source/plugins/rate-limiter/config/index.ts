import get from "get-value";
import set from "set-value";

import { configSchema } from "./schema";

class Config {
	public error: Error | undefined;
	public config: object = {};

	public load(options: object): void {
		this.reset();

		const { value, error } = configSchema.validate(options);

		if (error) {
			this.error = error;
			return;
		}

		this.config = value;
	}

	public reset(): void {
		this.error = undefined;
		this.config = {};
	}

	public get(key: string, defaultValue?: any): any {
		return get(this.config, key, defaultValue);
	}

	public set(key: string, value: any): void {
		set(this.config, key, value);
	}

	public getError(): Error | undefined {
		return this.error;
	}

	public hasError(): boolean {
		return !!this.error;
	}
}

export const config = new Config();
