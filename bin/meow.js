#!/usr/bin/env node

const meow = require("meow");

module.exports = meow(
	`
	Usage
	  $ ark-musig <input>
`,
	{
		flags: {
			coin: {
				type: "string",
				default: "ark",
			},
			mode: {
				type: "string",
				isRequired: true,
			},
			host: {
				type: "string",
				default: "0.0.0.0",
			},
			port: {
				type: "number",
				default: 3000,
			},
			database: {
				type: "string",
			},
			pending: {
				type: "number",
				default: 10,
			},
		},
	},
);
