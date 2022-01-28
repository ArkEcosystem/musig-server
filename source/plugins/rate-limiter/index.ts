import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { RateLimiterMemory, RLWrapperBlackAndWhite } from "rate-limiter-flexible";

import { config } from "./config/index";
import { RateLimitResult } from "./contracts";
import { isListed } from "./helpers";

export const plugin = {
	name: "hapi-rate-limiter-flexible",
	once: true,
	register(
		server: Hapi.Server,
		options: {
			enabled: boolean;
			points: number;
			duration: number;
			whitelist: string[];
			blacklist: string[];
		},
	): void {
		config.load(options);

		if (config.hasError()) {
			throw config.getError();
		}

		if (config.get("enabled") === false) {
			return;
		}

		const rateLimiter = new RLWrapperBlackAndWhite({
			blackList: config.get("blacklist") || [],
			isBlackListed: (ip: string): boolean => isListed(ip, config.get("blacklist")),
			isWhiteListed: (ip: string): boolean => isListed(ip, config.get("whitelist")),
			limiter: new RateLimiterMemory({
				duration: config.get("duration"),
				points: config.get("points"),
			}),
			runActionAnyway: false,
			whiteList: config.get("whitelist") || ["*"],
		});

		server.ext({
			async method(request, h) {
				let remoteAddress: string = request.info.remoteAddress;

				try {
					if (request.headers["x-forwarded-for"]) {
						remoteAddress = request.headers["x-forwarded-for"].split(",")[0];
					}
				} catch {
					remoteAddress = request.info.remoteAddress;
				}

				try {
					const result: RateLimitResult = await rateLimiter.consume(remoteAddress, 1);

					// @ts-ignore
					request.headers["Retry-After"] = result.msBeforeNext / 1000;
					// @ts-ignore
					request.headers["X-RateLimit-Limit"] = config.get("points");
					// @ts-ignore
					request.headers["X-RateLimit-Remaining"] = result.remainingPoints;
					// @ts-ignore
					request.headers["X-RateLimit-Reset"] = new Date(Date.now() + result.msBeforeNext);
				} catch (error) {
					if (error instanceof Error) {
						return Boom.internal(error.message);
					}

					const tooManyRequests = Boom.tooManyRequests();
					tooManyRequests.output.headers["Retry-After"] = `${
						Math.round((error as any).msBeforeNext / 1000) || 1
					}`;

					return tooManyRequests;
				}

				return h.continue;
			},
			type: "onPostAuth",
		});
	},
};
