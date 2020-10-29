import { Transactions as MagistrateTransactions } from "@arkecosystem/core-magistrate-crypto";
import { Enums, Interfaces, Transactions, Validation } from "@arkecosystem/crypto";

class TransactionSchemaVerifier {
	public constructor() {
		for (const schemaName of Object.keys(Transactions.schemas)) {
			this.extendTransaction(Transactions.schemas[schemaName], schemaName);
		}

		for (const MagistrateTransaction of Object.values(MagistrateTransactions)) {
			Transactions.TransactionRegistry.registerTransactionType(MagistrateTransaction);
			this.extendTransaction(MagistrateTransaction.getSchema());
		}
	}

	public verifySchema(data: Interfaces.ITransactionData) {
		if (!data.signatures) {
			data.signatures = [];
		}

		const isMultiSignatureRegistration =
			data.type === Enums.TransactionType.MultiSignature &&
			(!data.typeGroup || data.typeGroup === Enums.TransactionTypeGroup.Core);

		const { error } = Transactions.Verifier.verifySchema(data, !isMultiSignatureRegistration);

		if (error) {
			throw new Error(error);
		}
	}

	private extendTransaction(schema, schemaName?) {
		if (typeof schema !== "object" || !schema.properties.signatures.minItems || !schema.$id) {
			return;
		}

		Validation.validator.extendTransaction(schema, true);
		schema.properties.signatures.minItems = 1; // we require at least one participant to sign the tx

		if (schemaName && schemaName === "multiSignature") {
			schema.required = ["asset"];
		}

		Validation.validator.extendTransaction(schema);
	}
}

export const transactionSchemaVerifier = new TransactionSchemaVerifier();
