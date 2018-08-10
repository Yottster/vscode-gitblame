import { Disposable, Uri, workspace } from "vscode";

import { GitFile } from "./file";
import { GitFileDummy } from "./filedummy";
import { GitFilePhysical } from "./filephysical";

export class GitFileFactory {
    public static create(fileName: Uri, disposable: Disposable): GitFile {
        if (GitFileFactory.inWorkspace(fileName)) {
            return new GitFilePhysical(fileName, disposable);
        } else {
            return new GitFileDummy(fileName, disposable);
        }
    }

    private static inWorkspace(fileName: Uri): boolean {
        return !!workspace.getWorkspaceFolder(fileName);
    }
}
