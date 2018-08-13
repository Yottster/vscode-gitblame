import { execFile, ExecOptions } from "child_process";

import { ErrorHandler } from "./errorhandler";

export function execute(
    command: string,
    args: string[],
    options: ExecOptions = {},
): Promise<string> {
    return new Promise((resolve) => {
        ErrorHandler.logCommand(`${ command } ${ args.join(" ") }`);
        const callback = (error, stdout) => {
            if (error) {
                ErrorHandler.logError(error);
                resolve("");
            } else {
                resolve(stdout);
            }
        };
        execFile(command, args, options, callback);
    });
}
