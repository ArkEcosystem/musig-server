import "jest-extended";

import { Builders } from "@arkecosystem/core-magistrate-crypto";
import { Identities, Managers, Transactions } from "@arkecosystem/crypto";
import { Server } from "@hapi/hapi";
import got from "got";
import * as mocks from "../__mocks__/transaction";
import { launchServer } from "../__support__";

let server: Server;
beforeAll(async () => {
	server = await launchServer();
	Managers.configManager.setFromPreset("testnet");
});
afterAll(async () => server.stop());

let transaction;

describe("Transactions", () => {
	describe("GET transactions", () => {
		beforeEach(async () => {
			await got.delete("http://localhost:8080/transactions");
			transaction = Transactions.BuilderFactory.multiSignature()
				.multiSignatureAsset(mocks.multisigAsset)
				.network(23);
		});

		it("should return no transaction when the given public key doesnt exist", async () => {
			const response = await got.get(
				`http://localhost:8080/transactions?publicKey=035b63b4668ee261c16ca91443f3371e2fe349e131cb7bf5f8a3e93a3ddfdfc788`,
			);

			expect(JSON.parse(response.body)).toEqual([]);
		});

		it("should return the transaction associated with the sender publicKey provided", async () => {
			const data = transaction
				.sign(mocks.passphrase)
				.multiSign(mocks.passphrase, 0)
				.multiSign(mocks.passphrases[1], 1)
				.getStruct();
			await got.post(`http://localhost:8080/transaction`, {
				body: JSON.stringify({
					data,
					multisigAsset: mocks.multisigAsset,
				}),
			});

			const response = await got.get(`http://localhost:8080/transactions?publicKey=${mocks.publicKey}`);
			const body = JSON.parse(response.body);
			expect(body).toBeArrayOfSize(1);
			expect(body[0].data).toEqual(JSON.parse(JSON.stringify(data)));
			expect(body[0].multisigAsset).toEqual(mocks.multisigAsset);
			expect(body[0]).toHaveProperty("timestamp");
		});

		it("should filter transactions by state = pending/ready", async () => {
			const tx1Response = await got.post(`http://localhost:8080/transaction`, {
				body: JSON.stringify({
					data: transaction.sign(mocks.passphrase).multiSign(mocks.passphrase, 0).getStruct(),
					multisigAsset: mocks.multisigAsset,
				}),
			});

			const transaction2 = Transactions.BuilderFactory.multiSignature()
				.multiSignatureAsset(mocks.multisigAsset2)
				.network(23);

			const tx2Response = await got.post(`http://localhost:8080/transaction`, {
				body: JSON.stringify({
					data: transaction2
						.sign(mocks.passphrase2)
						.multiSign(mocks.passphrase2, 0)
						.multiSign(mocks.passphrases2[1], 1)
						.multiSign(mocks.passphrases2[2], 2)
						.getStruct(),
					multisigAsset: mocks.multisigAsset2,
				}),
			});

			const responsePending = await got.get(
				`http://localhost:8080/transactions?publicKey=${mocks.publicKey}&state=pending`,
			);
			const bodyPending = JSON.parse(responsePending.body);
			expect(bodyPending).toBeArrayOfSize(1);
			expect(bodyPending[0].id).toEqual(JSON.parse(tx1Response.body).id);
			expect(bodyPending[0].multisigAsset).toEqual(mocks.multisigAsset);
			expect(bodyPending[0]).toHaveProperty("timestamp");

			const responseReady = await got.get(
				`http://localhost:8080/transactions?publicKey=${mocks.publicKey2}&state=ready`,
			);
			const bodyReady = JSON.parse(responseReady.body);
			expect(bodyReady).toBeArrayOfSize(1);
			expect(bodyReady[0].id).toEqual(JSON.parse(tx2Response.body).id);
			expect(bodyReady[0].multisigAsset).toEqual(mocks.multisigAsset2);
			expect(bodyReady[0]).toHaveProperty("timestamp");

			const responseAll = await got.get(`http://localhost:8080/transactions?publicKey=${mocks.publicKey}`);
			const bodyAll = JSON.parse(responseAll.body);
			expect(bodyAll).toBeArrayOfSize(2);
		});
	});

	describe("MultiSignatureRegistration", () => {
		beforeEach(async () => {
			await got.delete("http://localhost:8080/transactions");
			transaction = Transactions.BuilderFactory.multiSignature()
				.multiSignatureAsset(mocks.multisigAsset)
				.network(23);
		});

		describe("POST transaction", () => {
			it("should store multisignature registration without signatures", async () => {
				const data = transaction.sign(mocks.passphrase).getStruct();

				const response = await got.post(`http://localhost:8080/transaction`, {
					body: JSON.stringify({
						data,
						multisigAsset: mocks.multisigAsset,
					}),
				});

				expect(JSON.parse(response.body)).toHaveProperty("id");
			});

			it("should store multisignature registration with one signature", async () => {
				const data = transaction.sign(mocks.passphrase).multiSign(mocks.passphrase, 0).getStruct();
				const response = await got.post(`http://localhost:8080/transaction`, {
					body: JSON.stringify({
						data,
						multisigAsset: mocks.multisigAsset,
					}),
				});

				expect(JSON.parse(response.body)).toHaveProperty("id");
			});

			it("should not store the same multisignature registration twice", async () => {
				const data = transaction.sign(mocks.passphrase).multiSign(mocks.passphrase, 0).getStruct();

				const response = await got.post(`http://localhost:8080/transaction`, {
					body: JSON.stringify({
						data,
						multisigAsset: mocks.multisigAsset,
					}),
				});

				expect(JSON.parse(response.body)).toHaveProperty("id");
			});

			it("should update the transaction", async () => {
				const data = transaction
					.senderPublicKey(mocks.publicKey)
					.multiSign(mocks.passphrase, 0)
					.multiSign(mocks.passphrases[1], 1)
					.getStruct();

				const responsePostTx = await got.post(`http://localhost:8080/transaction`, {
					body: JSON.stringify({
						data,
						multisigAsset: mocks.multisigAsset,
					}),
				});

				const responsePostBody = JSON.parse(responsePostTx.body);
				expect(responsePostBody).toHaveProperty("id");

				const data2ndSigned = transaction.multiSign(mocks.passphrases[2], 2).sign(mocks.passphrase).getStruct();

				await got.post("http://localhost:8080/transaction", {
					body: JSON.stringify({
						data: data2ndSigned,
						multisigAsset: mocks.multisigAsset,
					}),
				});
				const responseGetTx = await got.get(`http://localhost:8080/transaction/${responsePostBody.id}`);

				const body = JSON.parse(responseGetTx.body);
				expect(body).toBeObject();
				expect(body.data).toEqual(JSON.parse(JSON.stringify(data2ndSigned)));
				expect(body.multisigAsset).toEqual(mocks.multisigAsset);
				expect(body.id).toEqual(responsePostBody.id);
				expect(body).toHaveProperty("timestamp");
			});
		});
	});

	describe.each([
		[
			"transfer",
			Transactions.BuilderFactory.transfer().recipientId("ARwS7GvSqkaJsGXU1qoREt86UPf2KLbGKd").amount("1") as any,
		],
		[
			"business registration",
			new Builders.BusinessRegistrationBuilder()
				.senderPublicKey(Identities.PublicKey.fromMultiSignatureAsset(mocks.multisigAsset))
				.businessRegistrationAsset({
					name: "newbusiness",
					website: "http://business.new",
				}) as any,
		],
	])("%s multisigned", (name, builder) => {
		beforeAll(async () => {
			await got.delete("http://localhost:8080/transactions");
		});

		describe("POST transaction", () => {
			let transactionStoreId: string;
			it(`should store multisignature ${name} with one signature`, async () => {
				const data = builder
					.network(23)
					.senderPublicKey(Identities.PublicKey.fromMultiSignatureAsset(mocks.multisigAsset))
					.multiSign(mocks.passphrase, 0)
					.getStruct();

				const response = await got.post(`http://localhost:8080/transaction`, {
					body: JSON.stringify({
						data,
						multisigAsset: mocks.multisigAsset,
					}),
				});

				const responseBody = JSON.parse(response.body);
				expect(responseBody).toHaveProperty("id");
				transactionStoreId = responseBody.id;
			});

			it("should update the transaction", async () => {
				// Should not be READY
				let readyResponse = JSON.parse(
					(
						await got.get(
							"http://localhost:8080/transactions?publicKey=02a942252b20b1069eec7d677cafb6e40d1b6c5ca2f72b5fb88388b340e86a47e8&state=ready",
						)
					).body,
				);
				expect(readyResponse).toBeArray();
				expect(readyResponse).toBeEmpty();

				let pendingResponse = JSON.parse(
					(
						await got.get(
							"http://localhost:8080/transactions?publicKey=02a942252b20b1069eec7d677cafb6e40d1b6c5ca2f72b5fb88388b340e86a47e8&state=pending",
						)
					).body,
				);
				expect(pendingResponse).toBeArray();
				expect(pendingResponse).toHaveLength(1);

				// update second signature
				builder.multiSign(mocks.passphrases[1], 1);

				const transactionTwoSignatures = builder.getStruct();
				await got.post("http://localhost:8080/transaction", {
					body: JSON.stringify({
						data: transactionTwoSignatures,
						multisigAsset: mocks.multisigAsset,
					}),
				});

				let responseGetTx = await got.get(`http://localhost:8080/transaction/${transactionStoreId}`);

				const expectResponse = (transaction) => {
					expect(body).toBeObject();
					expect(body.data).toEqual(JSON.parse(JSON.stringify(transaction)));
					expect(body.multisigAsset).toEqual(mocks.multisigAsset);
					expect(body.id).toEqual(transactionStoreId);
					expect(body).toHaveProperty("timestamp");
				};

				let body = JSON.parse(responseGetTx.body);
				expectResponse(transactionTwoSignatures);

				// update third signature
				builder.multiSign(mocks.passphrases[2], 2);

				const transactionThreeSignatures = builder.getStruct();

				await got.post("http://localhost:8080/transaction", {
					body: JSON.stringify({
						data: transactionThreeSignatures,
						multisigAsset: mocks.multisigAsset,
					}),
				});

				responseGetTx = await got.get(`http://localhost:8080/transaction/${transactionStoreId}`);
				body = JSON.parse(responseGetTx.body);
				expectResponse(transactionThreeSignatures);

				// Should be READY
				readyResponse = JSON.parse(
					(
						await got.get(
							"http://localhost:8080/transactions?publicKey=02a942252b20b1069eec7d677cafb6e40d1b6c5ca2f72b5fb88388b340e86a47e8&state=ready",
						)
					).body,
				);
				expect(readyResponse).toBeArray();
				expect(readyResponse).toHaveLength(1);

				pendingResponse = JSON.parse(
					(
						await got.get(
							"http://localhost:8080/transactions?publicKey=02a942252b20b1069eec7d677cafb6e40d1b6c5ca2f72b5fb88388b340e86a47e8&state=pending",
						)
					).body,
				);
				expect(pendingResponse).toBeArray();
				expect(pendingResponse).toBeEmpty();
			});
		});
	});
});
