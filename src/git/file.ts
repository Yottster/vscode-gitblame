import { Uri, window, workspace } from "vscode";

import { TIME_CACHE_LIFETIME } from "../constants";
import { IGitBlameInfo } from "../interfaces";
import { ErrorHandler } from "../util/errorhandler";
import { Translation } from "../util/translation";
import { GitBlame } from "./blame";

export class GitFile {
    public readonly fileName: Uri;
    public disposeCallback: () => void;

    private cacheClearInterval: NodeJS.Timer;

    constructor(fileName: string, disposeCallback: () => void) {
        this.fileName = Uri.file(fileName);
        this.disposeCallback = disposeCallback;
    }

    public startCacheInterval(): void {
        clearInterval(this.cacheClearInterval);
        this.cacheClearInterval = setInterval(() => {
            const isOpen = window.visibleTextEditors.some(
                (editor) => editor.document.uri.fsPath === this.fileName.fsPath,
            );

            if (!isOpen) {
                ErrorHandler.logInfo(
                    Translation.do("info.clear_file", this.fileName.fsPath),
                );
                this.dispose();
            }
        }, TIME_CACHE_LIFETIME);
    }

    public async blame(): Promise<IGitBlameInfo> {
        return GitBlame.blankBlameInfo();
    }

    public dispose(): void {
        clearInterval(this.cacheClearInterval);
        this.disposeCallback();
        delete this.disposeCallback;
    }
}
