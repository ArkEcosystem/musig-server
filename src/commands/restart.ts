import cli from "cli-ux";

import { processManager } from "../process-manager";
import { CommandFlags } from "../types";
import { BaseCommand } from "./command";

export class RestartCommand extends BaseCommand {
	public static description = "Restart the MultiSignature server";

	public static examples: string[] = [
		`Restart the MultiSignature server
$ multisig-server restart
`,
	];

	public static flags: CommandFlags = {
		...BaseCommand.flagsConfiguration,
	};

	public async run(): Promise<void> {
		const { flags } = this.parse(RestartCommand);

		const processName: string = this.getProcessName(flags.network as string);

		try {
			this.abortMissingProcess(processName);
			this.abortStoppedProcess(processName);

			cli.action.start(`Restarting ${processName}`);

			processManager.restart(processName);
		} catch (error) {
			error.stderr ? this.error(`${error.message}: ${error.stderr}`) : this.error(error.message);
		} finally {
			cli.action.stop();
		}
	}
}
