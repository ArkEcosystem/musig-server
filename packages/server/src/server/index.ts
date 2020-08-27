import { Managers, Types, Validation } from "@arkecosystem/crypto";
import { Server } from "@hapi/hapi";
import { IStoreTransaction } from "../interfaces";
import { corsHeaders, serverType } from "../plugins";
import { logger } from "../services/logger";
import { memory } from "../services/memory";
import { Storage } from "../services/storage";
import { TransactionStatus } from "./enums";
import * as handlers from "./handlers";
import { transactionSchemaVerifier } from "./transaction-schema-verifier";

const initDatabaseSync = (network: string) => {
    const storage = new Storage();
    storage.connect(`transactions-storage-${network}.sqlite`);

    const transactions = storage.loadAll();
    memory.loadTransactions(transactions);

    storage.disconnect();
};

export async function startServer(options: Record<string, string | number | boolean>): Promise<Server> {
    const server = new Server({
        host: options.host as string,
        port: options.port as number,
    });

    await server.register({
        plugin: corsHeaders,
    });

    await server.register({
        plugin: serverType,
    });

    Managers.configManager.setFromPreset(options.network as Types.NetworkName);
    Managers.configManager.setHeight(options.height as number);
    Managers.configManager.getMilestone().aip11 = true;

    server.route({
        method: "GET",
        path: "/transactions",
        handler: handlers.getTransactions,
        options: {
            auth: false,
            validate: {
                async query(data: object, options: object) {
                    const schema = {
                        type: "object",
                        properties: {
                            publicKey: {
                                $ref: "publicKey",
                            },
                            state: { enum: [TransactionStatus.Ready, TransactionStatus.Pending] },
                        },
                    };
                    const { error } = Validation.validator.validate(schema, data);
                    if (error) {
                        throw new Error(error);
                    }
                },
            },
        },
    });

    server.route({
        method: "GET",
        path: "/transaction/{id}",
        handler: handlers.getTransaction,
    });

    server.route({
        method: "POST",
        path: "/transaction",
        handler: handlers.postTransaction,
        options: {
            auth: false,
            validate: {
                async payload(data: IStoreTransaction, options: object) {
                    transactionSchemaVerifier.verifySchema(data.data);
                },
            },
        },
    });

    server.route({
        method: "DELETE",
        path: "/transactions/{id}",
        handler: handlers.deleteTransactions,
    });

    initDatabaseSync(options.network as string);

    await server.start();

    logger.info(`MultiSignature server running on ${server.info.uri}`);

    return server;
}

export const exitHandler = (network: string) => {
    const storage = new Storage();
    storage.connect(`transactions-storage-${network}.sqlite`);

    const memTransactions = memory.getAllTransactions();
    storage.deleteAll();
    storage.bulkAdd(memTransactions);

    storage.disconnect();
};
