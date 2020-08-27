import Table from "cli-table3";
import dayjs from "dayjs";
import prettyBytes from "pretty-bytes";
import prettyMs from "pretty-ms";

import { processManager } from "../process-manager";
import { CommandFlags, ProcessDescription } from "../types";
import { renderTable } from "../utils";
import { BaseCommand } from "./command";

export class StatusCommand extends BaseCommand {
	public static description = "Show the MultiSignature server status";

	public static examples: string[] = [`$ multisig-server status`];

	public static flags: CommandFlags = {
		...BaseCommand.flagsConfiguration,
	};

	public async run(): Promise<void> {
		const { flags } = this.parse(StatusCommand);

		const processName: string = this.getProcessName(flags.network as string);

		this.abortMissingProcess(processName);

		renderTable(["ID", "Name", "Version", "Status", "Uptime", "CPU", "RAM"], (table: Table.Table) => {
			const app: ProcessDescription = processManager.describe(processName);

			// @ts-ignore
			table.push([
				app.pid,
				app.name,
				// @ts-ignore
				app.pm2_env.version,
				app.pm2_env.status,
				// @ts-ignore
				prettyMs(dayjs().diff(app.pm2_env.pm_uptime)),
				`${app.monit.cpu}%`,
				prettyBytes(app.monit.memory),
			]);
		});
	}
}
