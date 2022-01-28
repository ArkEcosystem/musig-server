import { CoreTransactionTypeGroup, IStoreTransaction, MultiSignatureRegistrationType } from "./contracts";

export const isRegistration = (transaction: IStoreTransaction) =>
	transaction.data.typeGroup === CoreTransactionTypeGroup && transaction.data.type === MultiSignatureRegistrationType;

export const minRequiredSignatures = (transaction: IStoreTransaction) =>
	isRegistration(transaction) ? (transaction.multisigAsset.publicKeys || []).length : +transaction.multisigAsset.min;

export const isExpired = (transaction: IStoreTransaction) => {
	// Expired after one day
	return Date.now() / 1000 - transaction.timestampReceived > 24 * 60 * 60;
};
