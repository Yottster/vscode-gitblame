import { access, constants } from "fs";
import { normalize } from "path";

import { workspace } from "vscode";

import { ErrorHandler } from "./errorhandler";
import { Translation } from "./translation";

export function getGitCommand(): Promise<string> {
    const gitConfig = workspace.getConfiguration("git");
    const pathCommand = gitConfig.get("path") as string;
    const promise = new Promise<string>((resolve) => {
        if (!pathCommand) {
            resolve("git");
        }

        const commandPath = normalize(pathCommand);

        access(commandPath, constants.X_OK, (err) => {
            if (err) {
                ErrorHandler.logError(
                    new Error(
                        Translation.do(
                            "error.gitcommand",
                            commandPath,
                            "git",
                        ),
                    ),
                );
                resolve("git");
            } else {
                resolve(commandPath);
            }
        });
    });

    return promise;
}
