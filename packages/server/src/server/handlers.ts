import Boom from "@hapi/boom";
import { IStoreTransaction } from "../interfaces";
import { memory } from "../services/memory";
import { TransactionStatus } from "./enums";
import { getBaseTransactionId, verifySignatures } from "./utils";

export const getTransactions = (request, h) => {
    try {
        const storeTransactions = memory.getTransactionsByPublicKey(request.query.publicKey);

        if (request.query.state === TransactionStatus.Pending) {
            return storeTransactions.filter((t) => t.data.signatures.length < t.multisigAsset.min);
        }

        if (request.query.state === TransactionStatus.Ready) {
            return storeTransactions.filter((t) => t.data.signatures.length >= t.multisigAsset.min);
        }

        return storeTransactions;
    } catch (error) {
        return Boom.badImplementation(error.message);
    }
};

export const getTransaction = (request, h) => {
    try {
        const transaction = memory.getTransactionById(request.params.id);

        if (transaction === undefined) {
            return Boom.notFound(`Failed to find transaction [${request.params.id}]`);
        }

        return transaction;
    } catch (error) {
        return Boom.badImplementation(error.message);
    }
};

export const postTransaction = (request, h) => {
    try {
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
    } catch (error) {
        return Boom.badImplementation(error.message);
    }
};

export const deleteTransactions = (request, h) => {
    try {
        memory.removeById(request.params.id);

        return h.response().code(204);
    } catch (error) {
        return Boom.badImplementation(error.message);
    }
};
