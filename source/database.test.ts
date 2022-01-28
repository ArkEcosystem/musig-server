import "jest-extended";

import { unlinkSync } from "fs";
import { join } from "path";
import { Utils } from "@arkecosystem/crypto";
import envPaths from "env-paths";

import { IStoreTransaction } from "./contracts";
import { Database } from "./database";

const signedTransaction: IStoreTransaction = {
	data: {
		type: 4,
		timestamp: 1,
		senderPublicKey: "5e93fd5cfe306ea2c34d7082a6c79692cf2f5c6e07aa6f9b4a11b4917d33f16bbb",
		nonce: Utils.BigNumber.make(2),
		amount: Utils.BigNumber.make(0),
		fee: Utils.BigNumber.make(1),
		version: 2,
		signatures: [
			"b0886cde987421f4ff1effe65bd946458dd1912d02ad338b877f1658f0b3612823d2e01e9edf929d850ab58a10fb98e5efba7a0c662b7bd3bc05e5001f9ef20888",
			"80699a598998375594e76605ddecb4be72f6df3154af870f172b2fc98a61ea1de03db0a6473e041530fa1cbc30801b1e56fbfa3bb1ddaef717e5351fb1f09e0777",
		],
		asset: {
			multiSignature: {
				min: 2,
				publicKeys: [
					"5e93fd5cfe306ea2c34d7082a6c79692cf2f5c6e07aa6f9b4a11b4917d33f16bbb",
					"c4fbe7dbc9cc52dd33b2b10cddd8d023c1ff30e1bcbb45fc813550540668295ccc",
				],
			},
		},
		id: "037602ae3aea5a597fa97d4489d287d98d24fe7c584e54a9ed359d3a06ae9466",
	},
	multisigAsset: {
		min: 2,
		publicKeys: [
			"5e93fd5cfe306ea2c34d7082a6c79692cf2f5c6e07aa6f9b4a11b4917d33f16bbb",
			"c4fbe7dbc9cc52dd33b2b10cddd8d023c1ff30e1bcbb45fc813550540668295ccc",
		],
	},
	timestampReceived: 1,
};

const snapshot = `
		Object {
		  "037602ae3aea5a597fa97d4489d287d98d24fe7c584e54a9ed359d3a06ae9466": Object {
		    "data": Object {
		      "amount": "0",
		      "asset": Object {
		        "multiSignature": Object {
		          "min": 2,
		          "publicKeys": Array [
		            "5e93fd5cfe306ea2c34d7082a6c79692cf2f5c6e07aa6f9b4a11b4917d33f16bbb",
		            "c4fbe7dbc9cc52dd33b2b10cddd8d023c1ff30e1bcbb45fc813550540668295ccc",
		          ],
		        },
		      },
		      "fee": "1",
		      "id": "037602ae3aea5a597fa97d4489d287d98d24fe7c584e54a9ed359d3a06ae9466",
		      "nonce": "2",
		      "senderPublicKey": "5e93fd5cfe306ea2c34d7082a6c79692cf2f5c6e07aa6f9b4a11b4917d33f16bbb",
		      "signatures": Array [
		        "b0886cde987421f4ff1effe65bd946458dd1912d02ad338b877f1658f0b3612823d2e01e9edf929d850ab58a10fb98e5efba7a0c662b7bd3bc05e5001f9ef20888",
		        "80699a598998375594e76605ddecb4be72f6df3154af870f172b2fc98a61ea1de03db0a6473e041530fa1cbc30801b1e56fbfa3bb1ddaef717e5351fb1f09e0777",
		      ],
		      "timestamp": 1,
		      "type": 4,
		      "version": 2,
		    },
		    "multisigAsset": Object {
		      "min": 2,
		      "publicKeys": Array [
		        "5e93fd5cfe306ea2c34d7082a6c79692cf2f5c6e07aa6f9b4a11b4917d33f16bbb",
		        "c4fbe7dbc9cc52dd33b2b10cddd8d023c1ff30e1bcbb45fc813550540668295ccc",
		      ],
		    },
		    "timestampReceived": 1,
		  },
		}
	`;

let subject: Database;
beforeEach(() => {
	subject = new Database("jest");
	subject.deleteAll();
});

afterEach(() => {
	const file = join(envPaths("@arkecosystem/musig-server").data, "jest.json");
	unlinkSync(file);
});

it("should bulk add and remove", () => {
	expect(subject.all()).toMatchInlineSnapshot(`Object {}`);

	subject.bulkAdd([signedTransaction]);

	expect(subject.all()).toMatchInlineSnapshot(snapshot);

	subject.bulkRemoveById([signedTransaction.data.id!]);

	expect(subject.all()).toMatchInlineSnapshot(`Object {}`);
});

it("should delete all rows", () => {
	expect(subject.all()).toMatchInlineSnapshot(`Object {}`);

	subject.bulkAdd([signedTransaction]);

	expect(subject.all()).toMatchInlineSnapshot(snapshot);

	subject.deleteAll();

	expect(subject.all()).toMatchInlineSnapshot(`Object {}`);
});

it("should load all rows", () => {
	expect(subject.loadAll()).toMatchInlineSnapshot(`Array []`);

	subject.bulkAdd([signedTransaction]);

	expect(subject.loadAll()).toEqual([signedTransaction]);

	expect(subject.all()).toMatchInlineSnapshot(snapshot);
});

it("should read file", () => {
	expect(subject.loadAll()).toMatchInlineSnapshot(`Array []`);

	subject.bulkAdd([signedTransaction]);

	const db = new Database("jest");

	expect(db.loadAll()).toEqual([signedTransaction]);

	expect(db.all()).toMatchInlineSnapshot(snapshot);
});
