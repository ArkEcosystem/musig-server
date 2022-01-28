import { Interfaces, Transactions } from "@arkecosystem/crypto";

import { IStoreTransaction } from "../interfaces";
import { getBaseTransactionId } from "../server/utils";

class Memory {
	private transactions: { [storeId: string]: IStoreTransaction } = {};

	// indexes on storeId
	private txStoreIdsBySender: { [senderPublicKey: string]: string[] } = {};
	private txStoreIdsByPublicKey: { [senderPublicKey: string]: string[] } = {};

	public constructor() {
		setInterval(() => this.purgeExpiredTransactions(), 15 * 60 * 1000);
	}

	public saveTransaction(transaction: IStoreTransaction): string {
		this.hasRemainingTransactionSlots(transaction.data.senderPublicKey!);

		const storeId = getBaseTransactionId(transaction.data);
		transaction.timestamp = Date.now();
		transaction.id = storeId;
		this.transactions[storeId] = transaction;
		this.txStoreIdsBySender[transaction.data.senderPublicKey!] =
			this.txStoreIdsBySender[transaction.data.senderPublicKey!] || [];
		this.txStoreIdsBySender[transaction.data.senderPublicKey!].push(storeId);

		for (const publicKey of transaction.multisigAsset.publicKeys) {
			this.txStoreIdsByPublicKey[publicKey] = this.txStoreIdsByPublicKey[publicKey] || [];
			this.txStoreIdsByPublicKey[publicKey].push(storeId);
		}

		return storeId;
	}

	public updateTransaction(transaction: Interfaces.ITransactionData): void {
		const storeId = getBaseTransactionId(transaction);
		const storeTxToUpdate = this.transactions[storeId];

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

		this.transactions[storeId].data.id = Transactions.Utils.getId(storeTxToUpdate.data);
	}

	public getTransactionById(storeId: string): IStoreTransaction {
		return this.transactions[storeId];
	}

	public getTransactionsByPublicKey(publicKey: string): IStoreTransaction[] {
		const storeIdsBySender = this.txStoreIdsBySender[publicKey] || [];
		const storeIdsByPublicKey = this.txStoreIdsByPublicKey[publicKey] || [];

		const allById = {};
		for (const id of storeIdsBySender.concat(storeIdsByPublicKey)) {
			allById[id] = this.getTransactionById(id);
		}

		return Object.values(allById);
	}

	public getAllTransactions(): IStoreTransaction[] {
		return Object.values(this.transactions);
	}

	public deleteAllTransactions(): void {
		for (const id of Object.keys(this.transactions)) {
			this.removeById(id);
		}
	}

	public loadTransactions(transactions: IStoreTransaction[]) {
		for (const transaction of transactions) {
			this.saveTransaction(transaction);
		}
	}

	public removeById(storeId: string): void {
		const { data, multisigAsset } = this.transactions[storeId];

					// @ts-ignore
		this.txStoreIdsBySender[data.senderPublicKey] = this.txStoreIdsBySender[data.senderPublicKey].filter(
			(id) => id !== storeId,
		);
		for (const publicKey of multisigAsset.publicKeys) {
			this.txStoreIdsByPublicKey[publicKey] = this.txStoreIdsByPublicKey[publicKey].filter(
				(id) => id !== storeId,
			);
		}

		// remove actual transaction
		delete this.transactions[storeId];
	}

	private purgeExpiredTransactions(): void {
		for (const id of Object.keys(this.transactions)) {
			const transaction = this.transactions[id];

			if (!transaction || !transaction?.timestamp) {
				throw new Error(`Transaction [${id}] could not be found.`);
			}

			if (Date.now() - transaction.timestamp > 24 * 60 * 60 * 1000) {
				this.removeById(id);
			}
		}
	}

	private hasRemainingTransactionSlots(publicKey: string): void {
		const pendingCount: number = (this.txStoreIdsBySender[publicKey] || []).length;

		if (pendingCount >= 3) {
			throw new Error(`The public key [${publicKey}] has reached its maximum of 3 pending transactions.`);
		}
	}
}

export const memory = new Memory();
