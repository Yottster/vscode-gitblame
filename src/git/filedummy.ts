import { ErrorHandler } from "../util/errorhandler";
import { Translation } from "../util/translation";
import { GitFile } from "./file";

export class GitFileDummy extends GitFile {
    constructor(fileName: string, disposeCallback: () => void) {
        super(fileName, disposeCallback);
        this.startCacheInterval();
        ErrorHandler.logInfo(
            Translation.do("info.file_outside", this.fileName.fsPath),
        );
    }
}
