import { access, constants as FSConstant } from "fs";
import { normalize } from "path";

import { workspace } from "vscode";

import { GIT_COMMAND_IN_PATH } from "../constants";
import { ErrorHandler } from "./errorhandler";
import { Translation } from "./translation";

export function getGitCommand(): Promise<string> {
    const gitConfig = workspace.getConfiguration("git");
    const pathCommand = gitConfig.get("path") as string;
    const promise = new Promise<string>((resolve) => {
        if (!pathCommand) {
            resolve(GIT_COMMAND_IN_PATH);
        }

        const commandPath = normalize(pathCommand);

        access(commandPath, FSConstant.X_OK, (err) => {
            if (err) {
                ErrorHandler.logError(
                    new Error(
                        Translation.do(
                            "error.gitcommand",
                            commandPath,
                            GIT_COMMAND_IN_PATH,
                        ),
                    ),
                );
                resolve(GIT_COMMAND_IN_PATH);
            } else {
                resolve(commandPath);
            }
        });
    });

    return promise;
}
