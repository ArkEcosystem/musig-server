import { Interfaces } from "@arkecosystem/crypto";

export interface IStoreTransaction {
	data: Interfaces.ITransactionData;
	multisigAsset: Interfaces.IMultiSignatureAsset;
	timestampReceived: number;
	timestamp?: number;
	id?: string;
}

export enum TransactionStatus {
	Ready = "ready",
	Pending = "pending",
}

export type TransactionIndex = Record<string, string[]>;

export const CoreTransactionTypeGroup = 1;
export const MultiSignatureRegistrationType = 4;
