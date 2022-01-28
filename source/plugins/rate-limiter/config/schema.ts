import Joi from "joi";

export const configSchema = Joi.object({
	blacklist: Joi.array().items(Joi.string().ip()),
	duration: Joi.number().default(60_000),
	enabled: Joi.boolean().default(true),
	points: Joi.number().default(100),
	whitelist: Joi.array().items(Joi.string().ip()),
});
