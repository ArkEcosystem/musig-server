import { existsSync } from "fs";
import { join } from "path";
import envPaths from "env-paths";
import { ensureFileSync, readJSONSync, writeJSONSync } from "fs-extra";

import { IStoreTransaction } from "./contracts";
import { transactionSchemaVerifier } from "./transaction-schema-verifier";

export class Database {
	readonly #file: string;
	readonly #database: Record<string, IStoreTransaction> = {};

	public constructor(mode: string) {
		this.#file = join(envPaths("@arkecosystem/musig-server").data, `${mode}.json`);

		console.log(`Database: ${this.#file}`);

		if (existsSync(this.#file)) {
			this.#database = readJSONSync(this.#file);

			for (const transaction of Object.values(this.#database)) {
				// This method is called to ensure transformation for certain fields (fee, amount,...) to BigNumber
				const { error } = transactionSchemaVerifier.verifySchema(transaction.data);

				if (error) {
					throw new Error(`Cannot load data: ${error}`);
				}
			}
		} else {
			ensureFileSync(this.#file);

			writeJSONSync(this.#file, {});
		}

		this.#write();
	}

	public disconnect(): void {
		this.#write();
	}

	public all(): Record<string, IStoreTransaction> {
		return this.#database;
	}

	public bulkAdd(data: IStoreTransaction[]): void {
		if (data.length === 0) {
			return;
		}

		for (const transaction of data) {
			if (!transaction.data.id) {
				continue;
			}

			this.#database[transaction.data.id] = transaction;
		}

		this.#write();
	}

	public bulkRemoveById(ids: string[]): void {
		if (ids.length === 0) {
			return;
		}

		for (const id of ids) {
			delete this.#database[id];
		}

		this.#write();
	}

	public loadAll(): IStoreTransaction[] {
		return Object.values(this.#database);
	}

	public deleteAll(): void {
		this.bulkRemoveById(Object.keys(this.#database));

		this.#write();
	}

	#write(): void {
		writeJSONSync(this.#file, this.#database ?? {});
	}
}
