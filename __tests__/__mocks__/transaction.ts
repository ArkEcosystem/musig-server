export const passphrase = "passphrase 1";
export const passphrases = [passphrase, "passphrase 2", "passphrase 3"];
export const publicKey = "03e8021105a6c202097e97e6c6d650942d913099bf6c9f14a6815df1023dde3b87";
export const participants = [
	publicKey,
	"03dfdaaa7fd28bc9359874b7e33138f4d0afe9937e152c59b83a99fae7eeb94899",
	"03de72ef9d3ebf1b374f1214f5b8dde823690ab2aa32b4b8b3226cc568aaed1562",
];
export const multisigAsset = {
	min: 2,
	publicKeys: participants,
};

export const passphrase2 = "passphrase 4";
export const passphrases2 = [passphrase2, "passphrase 5", passphrase];
export const publicKey2 = "038accc28123025d0b1dd306fcc192be42cbb44105e2bc9b61fe4509469aacb8c4";
export const participants2 = [
	publicKey2,
	"02589e70ae55be9cef04ef8ef1591a96721c8b2fbf082bd3521b4f248f5befb3b7",
	publicKey,
];
export const multisigAsset2 = {
	min: 2,
	publicKeys: participants2,
};
