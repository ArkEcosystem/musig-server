module.exports = {
    testEnvironment: "node",
    bail: true,
    verbose: true,
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testMatch: ["**/*.test.ts"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    watchman: false,
    setupFilesAfterEnv: ["jest-extended"],
};
