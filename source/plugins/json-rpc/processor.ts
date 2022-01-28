import { Server } from "@hapi/hapi";
import get from "get-value";
import { Schema } from "joi";

import { IProcessorOptions, IRequestParameters, IResponse, IResponseError, IValidationResult } from "./interfaces";

export class Processor {
	public constructor(private readonly server: Server, private readonly options: IProcessorOptions) {}

	public async resource<T = any>(payload: IRequestParameters): Promise<IResponse<T> | IResponseError> {
		const { method, params, id } = payload;

		try {
			let error: string | undefined;

			if (this.options.validate) {
				error = this.options.validate(payload || {}, this.options?.schema as object).error;
			} else {
				error = ((this.options.schema as Schema).validate(payload || {}) as unknown as IValidationResult).error;
			}

			if (error) {
				return this.createErrorResponse(payload?.id, -32_600, new Error(error));
			}

			const targetMethod = get(this.server.methods, method);

			if (!targetMethod) {
				return this.createErrorResponse(
					id,
					-32_601,
					new Error("The method does not exist / is not available."),
				);
			}

			// @ts-ignore
			const schema = this.server.app.schemas[method];

			if (schema) {
				// @ts-ignore
				const { error } = this.options.validate(params, schema);

				if (error) {
					return this.createErrorResponse(id, -32_602, new Error(error));
				}
			}

			const result = await targetMethod(params);

			if (result.isBoom) {
				return this.createErrorResponse(id, result.output.statusCode, result.output.payload);
			}

			return this.createSuccessResponse(id, result);
		} catch (error: any) {
			return this.createErrorResponse(id, -32_603, error);
		}
	}

	public async collection<T = any>(payloads: IRequestParameters[]): Promise<Array<IResponse<T>> | IResponseError[]> {
		const results = [];

		for (const payload of payloads) {
			// @ts-ignore
			results.push(await this.resource<T>(payload));
		}

		return results;
	}

	private createSuccessResponse<T = any>(id: string | number, result: T): IResponse<T> {
		return {
			id,
			jsonrpc: "2.0",
			result,
		};
	}

	private createErrorResponse(id: string | number, code: number, error: Error): IResponseError {
		return {
			error: {
				code,
				data: error.stack,
				message: error.message,
			},
			id,
			jsonrpc: "2.0",
		};
	}
}
