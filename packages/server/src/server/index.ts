import { plugins } from "@arkecosystem/core-http-utils";
import { Enums, Interfaces, Managers, Transactions, Types, Validation } from "@arkecosystem/crypto";
import { Server } from "@hapi/hapi";
import { IStoreTransaction } from "../interfaces";
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

    storage.disconnect();
};

const verifySchema = (data: Interfaces.ITransactionData) => {
    let validationResult;
    if (data.type === Enums.TransactionTypes.MultiSignature) {
        // need specific schema validation to disable the need for signatures number == participants number
        const multiSigSchema = Transactions.schemas.multiSignature;
        multiSigSchema.properties.signatures.minItems = 1;
        Validation.validator.extendTransaction(multiSigSchema, true);
        validationResult = Validation.validator.validate(multiSigSchema, data);
    } else {
        validationResult = Transactions.Verifier.verifySchema(data);
    }

    const { error } = validationResult;
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
        plugin: plugins.corsHeaders,
    });

    Managers.configManager.setFromPreset(options.network as Types.NetworkName);

    server.route({
        method: "GET",
        path: "/handshake",
        handler: handlers.getHandshake,
    });

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
                        required: ["publicKey"],
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

    server.route({
        method: "PUT",
        path: "/transaction/{id}",
        handler: handlers.putTransaction,
        options: {
            auth: false,
            validate: {
                async payload(data: { data: Interfaces.ITransactionData }, options: object) {
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
