import Boom from "@hapi/boom";
import Hapi, { Server } from "@hapi/hapi";
import MediaType from "media-type";

import { config } from "./config";
import { IProcessorOptions, IRequestParameters } from "./interfaces";
import { Processor } from "./processor";

export const plugin = {
	name: "hapi-json-rpc",
	once: true,
	register: (
		server: Server,
		options: {
			methods: [{ name: string; method: any; schema?: any }];
			processor?: IProcessorOptions;
		},
	) => {
		config.load(options);

		if (config.hasError()) {
			throw config.getError();
		}

		// @ts-ignore
		server.app.schemas = {};

		for (const method of Object.values(options.methods)) {
			// @ts-ignore
			server.app.schemas[method.name] = method.schema;

			// @ts-ignore
			delete method.schema;

			// @ts-ignore
			server.method(method);
		}

		server.ext("onPreHandler", (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
			if (request.headers["content-type"]) {
				const contentMedia: Record<string, any> = MediaType.fromString(request.headers["content-type"]);

				if (contentMedia["parameters"].charset === "UTF-8") {
					delete contentMedia["parameters"].charset;
				}

				const hasInvalidType: boolean = contentMedia["type"] !== "application";
				const hasInvalidSubType: boolean = contentMedia["subtype"] !== "json";
				const hasInvalidParameters: boolean = Object.keys(contentMedia["parameters"]).length > 0;

				if (hasInvalidType || hasInvalidSubType || hasInvalidParameters) {
					throw Boom.unsupportedMediaType('Expected content-type header to be "application/json"');
				}
			} else if (request.headers.accept && !request.headers.accept.includes("application/json")) {
				throw Boom.notAcceptable('Expected accept header to be "application/json"');
			}

			return h.continue;
		});

		server.route({
			async handler(request) {
				const processor: Processor = new Processor(request.server, config.get("processor") || {});

				return Array.isArray(request.payload)
					? processor.collection(request.payload as IRequestParameters[])
					: processor.resource(request.payload as IRequestParameters);
			},
			method: "POST",
			path: "/",
		});
	},
};
