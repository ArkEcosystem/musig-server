import { Networks } from "@arkecosystem/crypto";
import Command, { flags } from "@oclif/command";
import cli from "cli-ux";
import { confirm } from "../helpers/prompts";
import { processManager } from "../process-manager";
import { CommandFlags } from "../types";

export abstract class BaseCommand extends Command {
    public static flagsConfiguration: Record<string, object> = {
        host: flags.string({
            description: "the host that should be used to expose the API",
            default: "0.0.0.0",
        }),
        port: flags.integer({
            description: "the port that should be used to expose the API",
            default: 8080,
        }),
        network: flags.string({
            description: "the network for which the multisignature server is used",
            default: "testnet",
            options: Object.keys(Networks),
        }),
        height: flags.integer({
            description: "the height to load in the network milestone(s)",
            default: 1,
        }),
    };

    protected flagsToStrings(flags: CommandFlags, ignoreKeys: string[] = []): string {
        const mappedFlags = [];

        for (const [key, value] of Object.entries(flags)) {
            if (!ignoreKeys.includes(key) && value !== undefined) {
                if (value === false) {
                    continue;
                } else if (value === true) {
                    mappedFlags.push(`--${key}`);
                } else if (typeof value === "string") {
                    mappedFlags.push(value.includes(" ") ? `--${key}="${value}"` : `--${key}=${value}`);
                } else {
                    mappedFlags.push(`--${key}=${value}`);
                }
            }
        }

        return mappedFlags.join(" ");
    }

    protected abortWithInvalidInput(): void {
        this.error("Please enter valid data and try again!");
    }

    protected async restartRunningProcessPrompt(processName: string, showPrompt: boolean = true) {
        if (processManager.isOnline(processName)) {
            if (showPrompt) {
                await confirm(`Would you like to restart the ${processName} process?`, () => {
                    this.restartProcess(processName);
                });
            } else {
                this.restartProcess(processName);
            }
        }
    }

    protected restartProcess(processName: string): void {
        try {
            cli.action.start(`Restarting ${processName}`);

            processManager.restart(processName);
        } catch (error) {
            error.stderr ? this.error(`${error.message}: ${error.stderr}`) : this.error(error.message);
        } finally {
            cli.action.stop();
        }
    }

    protected abortRunningProcess(processName: string) {
        if (processManager.isOnline(processName)) {
            this.error(`The "${processName}" process is already running.`);
        }
    }

    protected abortStoppedProcess(processName: string) {
        if (processManager.isStopped(processName)) {
            this.error(`The "${processName}" process is not running.`);
        }
    }

    protected abortErroredProcess(processName: string) {
        if (processManager.isErrored(processName)) {
            this.error(`The "${processName}" process has errored.`);
        }
    }

    protected abortUnknownProcess(processName: string) {
        if (processManager.isUnknown(processName)) {
            this.error(
                `The "${processName}" process has entered an unknown state. (${processManager.status(processName)})`,
            );
        }
    }

    protected abortMissingProcess(processName: string) {
        if (processManager.missing(processName)) {
            this.error(`The "${processName}" process does not exist.`);
        }
    }

    protected getProcessName(network: string): string {
        return `multisig-server-${network}`;
    }
}
