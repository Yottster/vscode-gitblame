import { Disposable, Uri } from "vscode";

import { ErrorHandler } from "../util/errorhandler";
import { Translation } from "../util/translation";
import { GitFile } from "./file";

export class GitFileDummy extends GitFile {
    constructor(fileName: Uri, disposable: Disposable) {
        super(fileName, disposable);
        this.startCacheInterval();
        ErrorHandler.logInfo(
            Translation.do("info.file_outside", this.fileName.fsPath),
        );
    }
}
