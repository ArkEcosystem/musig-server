import { Enums, Interfaces, Managers, Transactions, Types, Validation } from "@arkecosystem/crypto";
import { Server } from "@hapi/hapi";
import { IStoreTransaction } from "../interfaces";
import { corsHeaders, serverType } from "../plugins";
import { logger } from "../services/logger";
import { memory } from "../services/memory";
import { Storage } from "../services/storage";
import { TransactionStatus } from "./enums";
import * as handlers from "./handlers";

const initDatabaseSync = () => {
    const storage = new Storage();
    storage.connect("transactions-storage.sqlite");

    const transactions = storage.loadAll();
    memory.loadTransactions(transactions);

    for (const schemaName of Object.keys(Transactions.schemas)) {
        const schema = Transactions.schemas[schemaName];

        if (typeof schema !== "object" || !schema.properties.signatures.minItems || !schema.$id) {
            continue;
        }

        Validation.validator.extendTransaction(schema, true);

        schema.properties.signatures.minItems = 0;

        if (schemaName === "multiSignature") {
            (schema as any).required = ["asset"];
        }

        Validation.validator.extendTransaction(schema);
    }

    storage.disconnect();
};

const verifySchema = (data: Interfaces.ITransactionData) => {
    const isMultiSignaureRegistration =
        data.type === Enums.TransactionType.MultiSignature &&
        (!data.typeGroup || data.typeGroup === Enums.TransactionTypeGroup.Core);

    const { error } = Transactions.Verifier.verifySchema(data, !isMultiSignaureRegistration);

    if (error) {
        throw new Error(error);
    }
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
                    verifySchema(data.data);
                },
            },
        },
    });

    // TODO to change obviously, but do we still allow to delete transactions in some way ?
    server.route({
        method: "DELETE",
        path: "/transactions",
        handler: handlers.deleteTransactions,
    });

    initDatabaseSync();

    await server.start();

    logger.info(`MultiSignature server running on ${server.info.uri}`);

    return server;
}

export const exitHandler = () => {
    const storage = new Storage();
    storage.connect("transactions-storage.sqlite");

    const memTransactions = memory.getAllTransactions();
    storage.deleteAll();
    storage.bulkAdd(memTransactions);

    storage.disconnect();
};
