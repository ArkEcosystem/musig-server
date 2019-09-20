import "jest-extended";

import { Identities, Managers, Transactions } from "@arkecosystem/crypto";
import { Server } from "@hapi/hapi";
import got from "got";
import { launchServer } from "../__support__";

let server: Server;
beforeAll(async () => {
    server = await launchServer();
    Managers.configManager.setFromPreset("testnet");
});
afterAll(async () => server.stop());

const passphrase = "passphrase 1";
const passphrases = [passphrase, "passphrase 2", "passphrase 3"];
const publicKey = "03e8021105a6c202097e97e6c6d650942d913099bf6c9f14a6815df1023dde3b87";
const participants = [
    publicKey,
    "03dfdaaa7fd28bc9359874b7e33138f4d0afe9937e152c59b83a99fae7eeb94899",
    "03de72ef9d3ebf1b374f1214f5b8dde823690ab2aa32b4b8b3226cc568aaed1562",
];
const multisigAsset = {
    min: 2,
    publicKeys: participants,
};
let transaction;

beforeEach(async () => {
    await got.delete("http://localhost:8080/transactions");
    transaction = Transactions.BuilderFactory.multiSignature()
        .multiSignatureAsset(multisigAsset)
        .network(23);
});

describe("Transactions", () => {
    describe("GET transactions", () => {
        it("should return no transaction when the given public key doesnt exist", async () => {
            const response = await got.get(
                `http://localhost:8080/transactions?publicKey=035b63b4668ee261c16ca91443f3371e2fe349e131cb7bf5f8a3e93a3ddfdfc788`,
            );

            expect(JSON.parse(response.body)).toEqual([]);
        });

        it("should return the transaction associated with the sender publicKey provided", async () => {
            const data = transaction
                .sign(passphrase)
                .multiSign(passphrase, 0)
                .multiSign(passphrases[1], 1)
                .getStruct();
            await got.post(`http://localhost:8080/transaction`, {
                body: JSON.stringify({
                    data,
                    multisigAsset,
                }),
            });

            const response = await got.get(`http://localhost:8080/transactions?publicKey=${publicKey}`);
            const body = JSON.parse(response.body);
            expect(body).toBeArrayOfSize(1);
            expect(body[0].data).toEqual(JSON.parse(JSON.stringify(data)));
            expect(body[0].multisigAsset).toEqual(multisigAsset);
            expect(body[0]).toHaveProperty("timestamp");
        });

        it("should filter transactions by state = pending/ready", async () => {
            const tx1Response = await got.post(`http://localhost:8080/transaction`, {
                body: JSON.stringify({
                    data: transaction
                        .sign(passphrase)
                        .multiSign(passphrase, 0)
                        .getStruct(),
                    multisigAsset,
                }),
            });

            const tx2Response = await got.post(`http://localhost:8080/transaction`, {
                body: JSON.stringify({
                    data: transaction.multiSign(passphrases[1], 1).getStruct(),
                    multisigAsset,
                }),
            });

            const responsePending = await got.get(
                `http://localhost:8080/transactions?publicKey=${publicKey}&state=pending`,
            );
            const bodyPending = JSON.parse(responsePending.body);
            expect(bodyPending).toBeArrayOfSize(1);
            expect(bodyPending[0].id).toEqual(JSON.parse(tx1Response.body).id);
            expect(bodyPending[0].multisigAsset).toEqual(multisigAsset);
            expect(bodyPending[0]).toHaveProperty("timestamp");

            const responseReady = await got.get(
                `http://localhost:8080/transactions?publicKey=${publicKey}&state=ready`,
            );
            const bodyReady = JSON.parse(responseReady.body);
            expect(bodyReady).toBeArrayOfSize(1);
            expect(bodyReady[0].id).toEqual(JSON.parse(tx2Response.body).id);
            expect(bodyReady[0].multisigAsset).toEqual(multisigAsset);
            expect(bodyReady[0]).toHaveProperty("timestamp");

            const responseAll = await got.get(`http://localhost:8080/transactions?publicKey=${publicKey}`);
            const bodyAll = JSON.parse(responseAll.body);
            expect(bodyAll).toBeArrayOfSize(2);
        });
    });

    describe("MultiSignatureRegistration", () => {
        describe("POST transaction", () => {
            it("should store multisignature registration without signatures", async () => {
                const data = transaction.sign(passphrase).getStruct();

                const response = await got.post(`http://localhost:8080/transaction`, {
                    body: JSON.stringify({
                        data,
                        multisigAsset,
                    }),
                });

                expect(JSON.parse(response.body)).toHaveProperty("id");
            });

            it("should store multisignature registration with one signature", async () => {
                const data = transaction
                    .sign(passphrase)
                    .multiSign(passphrase, 0)
                    .getStruct();
                const response = await got.post(`http://localhost:8080/transaction`, {
                    body: JSON.stringify({
                        data,
                        multisigAsset,
                    }),
                });

                expect(JSON.parse(response.body)).toHaveProperty("id");
            });

            it("should not store the same multisignature registration twice", async () => {
                const data = transaction
                    .sign(passphrase)
                    .multiSign(passphrase, 0)
                    .getStruct();

                const response = await got.post(`http://localhost:8080/transaction`, {
                    body: JSON.stringify({
                        data,
                        multisigAsset,
                    }),
                });

                expect(JSON.parse(response.body)).toHaveProperty("id");
            });
        });

        describe("PUT transaction", () => {
            it("should update the transaction", async () => {
                const data = transaction
                    .sign(passphrase)
                    .multiSign(passphrase, 0)
                    .multiSign(passphrases[1], 1)
                    .getStruct();

                const responsePostTx = await got.post(`http://localhost:8080/transaction`, {
                    body: JSON.stringify({
                        data,
                        multisigAsset,
                    }),
                });

                const responsePostBody = JSON.parse(responsePostTx.body);
                expect(responsePostBody).toHaveProperty("id");

                const data2ndSigned = transaction.multiSign(passphrases[2], 2).getStruct();

                await got.put(`http://localhost:8080/transaction/${responsePostBody.id}`, {
                    body: JSON.stringify({ data: data2ndSigned }),
                });
                const responseGetTx = await got.get(`http://localhost:8080/transaction/${responsePostBody.id}`);

                const body = JSON.parse(responseGetTx.body);
                expect(body).toBeObject();
                expect(body.data).toEqual(JSON.parse(JSON.stringify(data2ndSigned)));
                expect(body.multisigAsset).toEqual(multisigAsset);
                expect(body.id).toEqual(responsePostBody.id);
                expect(body).toHaveProperty("timestamp");
            });
        });
    });

    describe("MultiSignatureTransfer", () => {
        let transfer;
        beforeEach(async () => {
            await got.delete("http://localhost:8080/transactions");
            transfer = Transactions.BuilderFactory.transfer().network(23);
        });

        describe("POST transaction", () => {
            it("should store multisignature transfer with one signature", async () => {
                const data = transfer
                    .senderPublicKey(Identities.PublicKey.fromMultiSignatureAsset(multisigAsset))
                    .recipientId(Identities.Address.fromMultiSignatureAsset(multisigAsset))
                    .amount("1")
                    .multiSign(passphrase, 0)
                    .getStruct();

                const response = await got.post(`http://localhost:8080/transaction`, {
                    body: JSON.stringify({
                        data,
                        multisigAsset,
                    }),
                });

                expect(JSON.parse(response.body)).toHaveProperty("id");
            });
        });

        describe("PUT transaction", () => {
            it("should update the transaction", async () => {
                const data = transfer
                    .senderPublicKey(Identities.PublicKey.fromMultiSignatureAsset(multisigAsset))
                    .recipientId(Identities.Address.fromMultiSignatureAsset(multisigAsset))
                    .amount("1")
                    .multiSign(passphrase, 0);

                // PUT first signature
                const transferOneSignature = data.getStruct();
                const responsePostTx = await got.post(`http://localhost:8080/transaction`, {
                    body: JSON.stringify({
                        data: transferOneSignature,
                        multisigAsset,
                    }),
                });

                const responsePostBody = JSON.parse(responsePostTx.body);
                expect(responsePostBody).toHaveProperty("id");

                // Should not be READY
                let readyResponse = JSON.parse(
                    (await got.get(
                        "http://localhost:8080/transactions?publicKey=02a942252b20b1069eec7d677cafb6e40d1b6c5ca2f72b5fb88388b340e86a47e8&state=ready",
                    )).body,
                );
                expect(readyResponse).toBeArray();
                expect(readyResponse).toBeEmpty();

                let pendingResponse = JSON.parse(
                    (await got.get(
                        "http://localhost:8080/transactions?publicKey=02a942252b20b1069eec7d677cafb6e40d1b6c5ca2f72b5fb88388b340e86a47e8&state=pending",
                    )).body,
                );
                expect(pendingResponse).toBeArray();
                expect(pendingResponse).toHaveLength(1);

                // PUT second signature
                data.multiSign(passphrases[1], 1);

                const transferTwoSignatures = data.getStruct();
                await got.put(`http://localhost:8080/transaction/${responsePostBody.id}`, {
                    body: JSON.stringify({ data: transferTwoSignatures }),
                });

                let responseGetTx = await got.get(`http://localhost:8080/transaction/${responsePostBody.id}`);

                const expectResponse = transaction => {
                    expect(body).toBeObject();
                    expect(body.data).toEqual(JSON.parse(JSON.stringify(transaction)));
                    expect(body.multisigAsset).toEqual(multisigAsset);
                    expect(body.id).toEqual(responsePostBody.id);
                    expect(body).toHaveProperty("timestamp");
                };

                let body = JSON.parse(responseGetTx.body);
                expectResponse(transferTwoSignatures);

                // PUT third signature
                data.multiSign(passphrases[2], 2);

                const transferThreeSignatures = data.getStruct();

                await got.put(`http://localhost:8080/transaction/${responsePostBody.id}`, {
                    body: JSON.stringify({ data: transferThreeSignatures }),
                });

                responseGetTx = await got.get(`http://localhost:8080/transaction/${responsePostBody.id}`);
                body = JSON.parse(responseGetTx.body);
                expectResponse(transferThreeSignatures);

                // Should be READY
                readyResponse = JSON.parse(
                    (await got.get(
                        "http://localhost:8080/transactions?publicKey=02a942252b20b1069eec7d677cafb6e40d1b6c5ca2f72b5fb88388b340e86a47e8&state=ready",
                    )).body,
                );
                expect(readyResponse).toBeArray();
                expect(readyResponse).toHaveLength(1);

                pendingResponse = JSON.parse(
                    (await got.get(
                        "http://localhost:8080/transactions?publicKey=02a942252b20b1069eec7d677cafb6e40d1b6c5ca2f72b5fb88388b340e86a47e8&state=pending",
                    )).body,
                );
                expect(pendingResponse).toBeArray();
                expect(pendingResponse).toBeEmpty();
            });
        });
    });
});
