import Boom from "@hapi/boom";
import { IStoreTransaction } from "../interfaces";
import { memory } from "../services/memory";
import { TransactionStatus } from "./enums";
import { getBaseTransactionId, verifySignatures } from "./utils";

export const getTransactions = (request, h) => {
    if (request.query.publicKey) {
        const storeTransactions = memory.getTransactionsByPublicKey(request.query.publicKey);

        if (request.query.state === TransactionStatus.Pending) {
            return storeTransactions.filter(t => t.data.signatures.length < t.multisigAsset.min);
        } else if (request.query.state === TransactionStatus.Ready) {
            return storeTransactions.filter(t => t.data.signatures.length >= t.multisigAsset.min);
        }
        return storeTransactions;
    }

    return memory.getAllTransactions(); // keep or throw error ? (why would we need to get all tx ?)
};

export const getTransaction = (request, h) => {
    return memory.getTransactionById(request.params.id);
};

export const postTransaction = (request, h) => {
    const transaction: IStoreTransaction = request.payload;

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
};

export const deleteTransactions = (request, h) => {
    memory.deleteAllTransactions();
    return true;
};
