import "jest-extended";

import { Transactions } from "@arkecosystem/crypto";
import { BigNumber } from "@arkecosystem/crypto/dist/utils";

import { Memory } from "./memory";

const memory = new Memory({ host: "", pendingLimit: 3 });

describe("#saveTransaction", () => {
	it("should append the transaction to a new list", () => {
		const transaction = Transactions.BuilderFactory.transfer()
			.amount("1000")
			.fee("2000")
			.recipientId("DNjuJEDQkhrJ7cA9FZ2iVXt5anYiM8Jtc9")
			.senderPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dec")
			.sign("sender")
			.build();

		const storeId = memory.saveTransaction({
			data: transaction.data,
			multisigAsset: {
				min: 2,
				publicKeys: [
					"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dea",
					"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621deb",
					"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dec",
				],
			},
			timestampReceived: transaction.timestamp,
			timestamp: transaction.timestamp,
			id: transaction.id,
		});

		expect(memory.getTransactionById(storeId)).toBeObject();
		expect(memory.getTransactionById("random")).toBeUndefined();
		expect(
			memory.getTransactionsByPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dea"),
		).toHaveLength(1);
		expect(
			memory.getTransactionsByPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621deb"),
		).toHaveLength(1);
		expect(
			memory.getTransactionsByPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dec"),
		).toHaveLength(1);
		expect(
			memory.getTransactionsByPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621ded"),
		).toHaveLength(0);
	});

	it("should append the transaction to the existing list", () => {
		for (let i = 1; i < 3; i++) {
			const transaction = Transactions.BuilderFactory.transfer()
				.amount(BigNumber.make(i).times(1e8).toString())
				.fee(BigNumber.make(i).times(1e8).toString())
				.recipientId("DNjuJEDQkhrJ7cA9FZ2iVXt5anYiM8Jtc9")
				.senderPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dec")
				.sign("sender")
				.build();

			memory.saveTransaction({
				data: transaction.data,
				multisigAsset: {
					min: 2,
					publicKeys: [
						"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dea",
						"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621deb",
						"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dec",
					],
				},
				timestampReceived: transaction.timestamp,
				timestamp: transaction.timestamp,
				id: transaction.id,
			});
		}

		expect(
			memory.getTransactionsByPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dea"),
		).toHaveLength(3);
		expect(
			memory.getTransactionsByPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621deb"),
		).toHaveLength(3);
		expect(
			memory.getTransactionsByPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dec"),
		).toHaveLength(3);
		expect(
			memory.getTransactionsByPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621ded"),
		).toHaveLength(0);
	});

	it("should throw if the transaction has no sender public key", () => {
		const transaction = Transactions.BuilderFactory.transfer()
			.amount("1000")
			.fee("2000")
			.recipientId("DNjuJEDQkhrJ7cA9FZ2iVXt5anYiM8Jtc9")
			.senderPublicKey("03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dec")
			.sign("sender")
			.build();

		delete transaction.data.senderPublicKey;

		expect(() =>
			memory.saveTransaction({
				data: transaction.data,
				multisigAsset: {
					min: 2,
					publicKeys: [
						"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dea",
						"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621deb",
						"03bbfb43ecb5a54a1e227bb37b5812b5321213838d376e2b455b6af78442621dec",
					],
				},
				timestampReceived: transaction.timestamp,
				timestamp: transaction.timestamp,
				id: transaction.id,
			}),
		).toThrow(`Transaction [${transaction.id}] has no sender public key.`);
	});
});
