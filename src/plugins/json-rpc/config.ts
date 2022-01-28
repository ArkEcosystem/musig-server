import get from "get-value";
import Joi from "joi";
import set from "set-value";

class Config {
	public error: Error | undefined;
	public config: object = {};

	public load(options: object): void {
		this.reset();

		const { value, error } = Joi.object({
			methods: Joi.array()
				.items(
					Joi.object().keys({
						method: Joi.func().required(),
						name: Joi.string().required(),
						schema: Joi.object(),
					}),
				)
				.required(),
			processor: Joi.object()
				.keys({
					schema: Joi.object().default(
						Joi.object().keys({
							id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
							jsonrpc: Joi.string().allow("2.0").required(),
							method: Joi.string().required(),
							params: Joi.object(),
						}),
					),
					validate: Joi.function(),
				})
				.default(),
		}).validate(options);

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
