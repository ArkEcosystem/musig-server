import { Managers } from "@arkecosystem/crypto";
import Boom from "@hapi/boom";
import { Server } from "@hapi/hapi";
import Joi, { AnySchema } from "joi";
import fetch from "cross-fetch";
import { plugin as RPC } from "./plugins/json-rpc";

import { IStoreTransaction, TransactionStatus } from "./contracts";
import { getBaseTransactionId, verifySignatures } from "./crypto";
import { Database } from "./database";
import { Memory } from "./memory";
import { minRequiredSignatures } from "./transaction-helpers";
import { transactionSchemaVerifier } from "./transaction-schema-verifier";

export async function subscribe(options: Record<string, string | number | boolean>): Promise<Server> {
	const server = new Server({
		host: options.host as string,
		port: options.port as number,
		routes: {
			cors: {
				origin: "ignore",
			},
		},
	});

	const coinHost: string = {
		ark: {
			live: "https://musig-live.ark.io",
			test: "https://musig-test.ark.io",
		},
		bind: {
			live: "https://apis.compendia.org",
			test: "https://apis-testnet.compendia.org",
		},
	}[options.coin as string]![options.mode as string];

	console.info(`Config: ${coinHost}`);
	const { data: apiConfig } = await (await fetch(`${coinHost}/api/node/configuration/crypto`)).json();

	console.info(`Blocks: ${coinHost}`);
	const { data: apiBlocks } = await (await fetch(`${coinHost}/api/blockchain`)).json();

	Managers.configManager.setConfig(apiConfig);
	Managers.configManager.setHeight(apiBlocks.block.height);

	const memory = new Memory({
		host: coinHost,
		pendingLimit: options.pending,
	});

	await server.register({
		// @ts-ignore
		plugin: RPC,
		options: {
			methods: [
				{
					name: "list",
					async method({ publicKey, state }) {
						const storeTransactions = memory.getTransactionsByPublicKey(publicKey);

						if (state === TransactionStatus.Pending) {
							return storeTransactions.filter(
								(transaction) =>
									(transaction.data.signatures || []).length < minRequiredSignatures(transaction),
							);
						}

						if (state === TransactionStatus.Ready) {
							return storeTransactions.filter(
								(transaction) =>
									(transaction.data.signatures || []).length >= minRequiredSignatures(transaction),
							);
						}

						return storeTransactions;
					},
					schema: Joi.object()
						.keys({
							publicKey: Joi.string().required(),
							state: Joi.string().allow("pending", "ready"),
						})
						.required(),
				},
				{
					name: "show",
					async method({ id }) {
						const transaction = memory.getTransactionById(id);

						if (transaction === undefined) {
							return Boom.notFound(`Failed to find transaction [${id}]`);
						}

						return transaction;
					},
					schema: Joi.object()
						.keys({
							id: Joi.string().length(64).required(),
						})
						.required(),
				},
				{
					name: "store",
					async method(transaction: IStoreTransaction) {
						const { error, errors } = transactionSchemaVerifier.verifySchema(transaction.data);

						if (error) {
							return Boom.badData(error, errors);
						}

						if (transaction.data.signatures && transaction.data.signatures.length) {
							if (!verifySignatures(transaction.data, transaction.multisigAsset)) {
								return Boom.badData("Transaction signatures are not valid");
							}
						}

						const baseTransactionId = getBaseTransactionId(transaction.data);
						const storeTransaction = memory.getTransactionById(baseTransactionId);

						if (storeTransaction) {
							memory.updateTransaction(transaction.data);

							return { id: baseTransactionId };
						}

						return { id: memory.saveTransaction(transaction) };
					},
					// @TODO: specify allowed keys
					schema: Joi.object().required(),
				},
				{
					name: "delete",
					async method({ id }) {
						const transaction = memory.getTransactionById(id);

						if (transaction === undefined) {
							return Boom.notFound(`Failed to find transaction [${id}]`);
						}

						memory.removeById(id);

						return { id };
					},
					schema: Joi.object()
						.keys({
							id: Joi.string().length(64).required(),
						})
						.required(),
				},
			],
			processor: {
				schema: Joi.object().keys({
					id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
					jsonrpc: Joi.string().allow("2.0").required(),
					method: Joi.string().required(),
					params: Joi.object(),
				}),
				validate: (data: object, schema: AnySchema) => schema.validate(data),
			},
		},
	});

	// Boto database
	const storage = new Database(options.mode as string);
	memory.loadTransactions(storage.loadAll());
	storage.disconnect();

	// Boot server
	await server.start();

	console.info(`Server: ${server.info.uri}`);
	console.info(`Remote: ${coinHost}`);

	const exit = async () => {
		const memTransactions = memory.getAllTransactions();
		storage.deleteAll();
		storage.bulkAdd(memTransactions);
		storage.disconnect();

		await server.stop();
	};

	process.on("exit", exit);
	process.on("SIGINT", () => process.exit());

	return server;
}
