import { flags } from "@oclif/command";
import cli from "cli-ux";

import { processManager } from "../process-manager";
import { CommandFlags } from "../types";
import { BaseCommand } from "./command";

export class StopCommand extends BaseCommand {
	public static description = "Stop the MultiSignature server";

	public static examples: string[] = [
		`Stop the MultiSignature server
$ multisig-server stop
`,
	];

	public static flags: CommandFlags = {
		...BaseCommand.flagsConfiguration,
		kill: flags.boolean({
			description: "kill the process or daemon",
		}),
	};

	public async run(): Promise<void> {
		const { flags } = this.parse(StopCommand);

		const processName: string = this.getProcessName(flags.network as string);

		try {
			this.abortMissingProcess(processName);
			this.abortUnknownProcess(processName);
			this.abortStoppedProcess(processName);

			cli.action.start(`Stopping ${processName}`);

			processManager[flags.kill ? "delete" : "stop"](processName);
		} catch (error) {
			this.error(error.message);
		} finally {
			cli.action.stop();
		}
	}
}
