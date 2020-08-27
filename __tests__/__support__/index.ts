import { Server } from "@hapi/hapi";
import { startServer } from "../../src/app/server";

jest.setTimeout(10000);

export const launchServer = async (): Promise<Server> => {
    return startServer({
        host: "0.0.0.0",
        port: 8080,
        network: "testnet",
    });
};
