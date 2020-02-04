import "jest-extended";

import { Managers, Transactions } from "@arkecosystem/crypto";
import { getBaseTransactionId } from "../../packages/server/src/server/utils";
import { multisigAsset, passphrase, passphrases, publicKey } from "../__mocks__/transaction";

beforeAll(async () => {
    Managers.configManager.setFromPreset("testnet");
    Managers.configManager.setHeight(2); // aip11 from height 2
});

describe("Utils", () => {
    describe("getBaseTransactionId", () => {
        it("should return the base transaction id", () => {
            const transactionBuilder = Transactions.BuilderFactory.multiSignature()
                .multiSignatureAsset(multisigAsset)
                .network(23)
                .senderPublicKey(publicKey);

            const baseTransactionId = Transactions.Utils.getId(transactionBuilder.data);

            const transaction = transactionBuilder
                .multiSign(passphrase, 0)
                .multiSign(passphrases[1], 1)
                .sign(passphrase)
                .getStruct();

            expect(getBaseTransactionId(transaction)).toBe(baseTransactionId);
        });
    });
});
