import "jest-extended";

import { Managers, Transactions } from "@arkecosystem/crypto";
import { Server } from "@hapi/hapi";
import fs from "fs-extra";
import got from "got";
import * as mocks from "../__mocks__/transaction";
import { launchServer } from "../__support__";

// the name of sqlite db that is used for saving/restoring tx on stop/start
const sqliteName = "transactions-storage-testnet.sqlite";
let server: Server;
beforeAll(async () => {
    fs.removeSync(sqliteName);

    server = await launchServer();
    Managers.configManager.setFromPreset("testnet");
});
afterAll(async () => {
    await server.stop();
    fs.removeSync(sqliteName);
});

describe("Server", () => {
    describe("Server stop and restart", () => {
        it("should save the transactions to the disk when stopping and restore them when restarting", async () => {
            const transaction = Transactions.BuilderFactory.multiSignature()
                .multiSignatureAsset(mocks.multisigAsset)
                .network(23)
                .sign(mocks.passphrase)
                .multiSign(mocks.passphrase, 0)
                .multiSign(mocks.passphrases[1], 1)
                .getStruct();
            await got.post(`http://localhost:8080/transaction`, {
                body: JSON.stringify({
                    data: transaction,
                    multisigAsset: mocks.multisigAsset,
                }),
            });

            const response = await got.get(`http://localhost:8080/transactions?publicKey=${mocks.publicKey}`);
            const body = JSON.parse(response.body);
            expect(body).toBeArrayOfSize(1);
            expect(body[0].data).toEqual(JSON.parse(JSON.stringify(transaction)));
            expect(body[0].multisigAsset).toEqual(mocks.multisigAsset);
            expect(body[0]).toHaveProperty("timestamp");

            await server.stop();

            expect(fs.existsSync(sqliteName)).toBeTrue(); // transactions should be saved here

            server = await launchServer();
            const responseAfterRestart = await got.get(
                `http://localhost:8080/transactions?publicKey=${mocks.publicKey}`,
            );
            const bodyAfterRestart = JSON.parse(responseAfterRestart.body);
            expect(bodyAfterRestart).toBeArrayOfSize(1);
            expect(bodyAfterRestart[0].data).toEqual(JSON.parse(JSON.stringify(transaction)));
            expect(bodyAfterRestart[0].multisigAsset).toEqual(mocks.multisigAsset);
            expect(bodyAfterRestart[0]).toHaveProperty("timestamp");
        });
    });
});
