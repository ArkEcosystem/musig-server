module.exports = {
	bail: false,
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	setupFilesAfterEnv: ["jest-extended"],
	testEnvironment: "node",
	testMatch: ["**/*.test.ts"],
	transform: {
		"^.+\\.tsx?$": "ts-jest",
	},
	verbose: true,
	collectCoverage: true,
	collectCoverageFrom: [
		"source/**/*.ts",
		"!source/**/index.ts",
		"!**/node_modules/**",
		"!source/(container|contracts|manifest|schema|service-provider|dto|repositories).ts",
	],
	coverageDirectory: "<rootDir>/.coverage",
	coverageReporters: ["json", "lcov", "text", "clover", "html"],
	// coverageThreshold: {
	// 	global: {
	// 		branches: 100,
	// 		functions: 100,
	// 		lines: 100,
	// 		statements: 100,
	// 	},
	// },
};
