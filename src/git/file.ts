import { Disposable, Uri, window } from "vscode";

import { IGitBlameInfo } from "../interfaces";
import { ErrorHandler } from "../util/errorhandler";
import { Translation } from "../util/translation";
import { GitBlame } from "./blame";

export class GitFile {
    private static cacheLifetime: number = 240_000;

    public readonly fileName: Uri;
    public readonly disposable: Disposable;

    private cacheClearInterval: NodeJS.Timer;

    constructor(fileName: Uri, disposable: Disposable) {
        this.fileName = fileName;
        this.disposable = disposable;
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
        }, GitFile.cacheLifetime);
    }

    public async blame(): Promise<IGitBlameInfo> {
        return GitBlame.blankBlameInfo();
    }

    public dispose(): void {
        clearInterval(this.cacheClearInterval);
        this.disposable.dispose();
    }
}
