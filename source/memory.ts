import { Interfaces, Managers, Transactions } from "@arkecosystem/crypto";
import fetch from "cross-fetch";

import { IStoreTransaction, TransactionIndex } from "./contracts";
import { getBaseTransactionId } from "./crypto";
import { isExpired } from "./transaction-helpers";

export class Memory {
	#host: string;
	#pendingLimit: number;
	#transactions: { [storeId: string]: IStoreTransaction } = {};
	#transactionIdsBySender: TransactionIndex = {};
	#transactionIdsByPublicKey: TransactionIndex = {};

	public constructor({ host, pendingLimit }) {
		this.#host = host;
		this.#pendingLimit = pendingLimit;

		setInterval(() => this.#purgeExpiredTransactions(), 15 * 60 * 1000);
		setInterval(() => this.#purgeConfirmedTransactions(), Managers.configManager.getMilestone().blocktime * 1000);
	}

	public saveTransaction(transaction: IStoreTransaction): string {
		if (!transaction.data.senderPublicKey) {
			throw new Error(`Transaction [${transaction.id}] has no sender public key.`);
		}

		this.#hasRemainingTransactionSlots(transaction.data.senderPublicKey);

		transaction.timestampReceived = Date.now() / 1000;
		transaction.id = getBaseTransactionId(transaction.data);

		this.#transactions[transaction.id] = transaction;

		if (this.#transactionIdsBySender[transaction.data.senderPublicKey] === undefined) {
			this.#transactionIdsBySender[transaction.data.senderPublicKey] = [];
		}

		this.#transactionIdsBySender[transaction.data.senderPublicKey].push(transaction.id);

		for (const publicKey of transaction.multisigAsset.publicKeys) {
			this.#transactionIdsByPublicKey[publicKey] = this.#transactionIdsByPublicKey[publicKey] || [];
			this.#transactionIdsByPublicKey[publicKey].push(transaction.id);
		}

		return transaction.id;
	}

	public updateTransaction(transaction: Interfaces.ITransactionData): void {
		const storeId = getBaseTransactionId(transaction);
		const storeTxToUpdate = this.#transactions[storeId];

		if (!storeTxToUpdate) {
			throw new Error(`No transaction found for store ID ${storeId}`);
		}

		if (transaction.signatures === undefined) {
			throw new Error(`Transaction [${storeId}] has no signatures.`);
		}

		for (let signatureIndex = 0; signatureIndex < transaction.signatures.length; signatureIndex++) {
			if (storeTxToUpdate.data.signatures === undefined) {
				storeTxToUpdate.data.signatures = [];
			}

			storeTxToUpdate.data.signatures[signatureIndex] = transaction.signatures[signatureIndex];
		}

		if (transaction.signature) {
			storeTxToUpdate.data.signature = transaction.signature;
		}

		this.#transactions[storeId].data.id = Transactions.Utils.getId(storeTxToUpdate.data);
	}

	public getTransactionById(storeId: string): IStoreTransaction {
		return this.#transactions[storeId];
	}

	public getTransactionsByPublicKey(publicKey: string): IStoreTransaction[] {
		const storeIdsBySender = this.#transactionIdsBySender[publicKey] || [];
		const storeIdsByPublicKey = this.#transactionIdsByPublicKey[publicKey] || [];

		const allById = {};
		for (const id of storeIdsBySender.concat(storeIdsByPublicKey)) {
			allById[id] = this.getTransactionById(id);
		}

		return Object.values(allById);
	}

	public getAllTransactions(): IStoreTransaction[] {
		return Object.values(this.#transactions);
	}

	public deleteAllTransactions(): void {
		for (const id of Object.keys(this.#transactions)) {
			this.removeById(id);
		}
	}

	public loadTransactions(transactions: IStoreTransaction[]) {
		for (const transaction of transactions) {
			this.saveTransaction(transaction);
		}
	}

	public removeById(storeId: string): void {
		const { data, multisigAsset } = this.#transactions[storeId];

		// removes indexes
		this.#transactionIdsBySender[data.senderPublicKey!] = this.#transactionIdsBySender[
			data.senderPublicKey!
		].filter((id) => id !== storeId);

		for (const publicKey of multisigAsset.publicKeys) {
			this.#transactionIdsByPublicKey[publicKey] = this.#transactionIdsByPublicKey[publicKey].filter(
				(id) => id !== storeId,
			);
		}

		// remove actual transaction
		delete this.#transactions[storeId];
	}

	#purgeExpiredTransactions(): void {
		for (const transaction of Object.values(this.#transactions)) {
			if (!transaction?.timestampReceived) {
				continue;
			}

			if (isExpired(transaction)) {
				this.removeById(transaction.id!);
			}
		}
	}

	async #purgeConfirmedTransactions(): Promise<void> {
		for (const { id, data } of this.getAllTransactions()) {
			if (!id) {
				continue;
			}

			const { status } = await fetch(`${this.#host}/api/transactions/${data.id}`);

			if (status === 200) {
				this.removeById(id);

				console.log(`Removed transaction ${id} (Network ID ${data.id})`);
			}
		}
	}

	#hasRemainingTransactionSlots(publicKey: string): void {
		const pendingCount: number = (this.#transactionIdsBySender[publicKey] || []).length;

		if (pendingCount >= this.#pendingLimit) {
			throw new Error(
				`The public key [${publicKey}] has reached its maximum of ${this.#pendingLimit} pending transactions.`,
			);
		}
	}
}
