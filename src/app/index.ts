import { Server } from "@hapi/hapi";
import { exitHandler, startServer } from "./server";
import { logger } from "./services/logger";

export * from "./interfaces";

export const start = async (options: { server: Record<string, any>; logger?: any }): Promise<Server> => {
    if (options.logger) {
        logger.setLogger(options.logger);
    }

    const server = await startServer(options.server);

    const exit = () => {
        exitHandler(options.server.network);
        server.stop();
    };
    process.on("exit", exit);
    process.on("SIGINT", () => process.exit());

    return server;
};
