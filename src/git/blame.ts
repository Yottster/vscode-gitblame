import { dirname } from "path";

import { isWebUri } from "valid-url";
import {
    commands,
    Disposable,
    Uri,
    window,
    workspace,
} from "vscode";

import { IGitBlameInfo, IGitCommitInfo } from "../interfaces";
import { ActionableMessageItem } from "../util/actionablemessageitem";
import { isActiveEditorValid } from "../util/editorvalidator";
import { ErrorHandler } from "../util/errorhandler";
import { execute } from "../util/execcommand";
import { getGitCommand } from "../util/gitcommand";
import { getProperty, Properties } from "../util/property";
import { TextDecorator } from "../util/textdecorator";
import { Translation } from "../util/translation";
import { StatusBarView } from "../view";
import { GitFile } from "./file";
import { GitFileFactory } from "./filefactory";

export class GitBlame {
    public static blankBlameInfo(): IGitBlameInfo {
        return {
            commits: {},
            lines: {},
        };
    }

    public static blankCommitInfo(real: boolean = false): IGitCommitInfo {
        return {
            author: {
                mail: "",
                name: "",
                timestamp: 0,
                tz: "",
            },
            committer: {
                mail: "",
                name: "",
                timestamp: 0,
                tz: "",
            },
            filename: "",
            generated: !real,
            hash: GitBlame.blank,
            summary: "",
        };
    }

    public static isBlankCommit(commit: IGitCommitInfo): boolean {
        return commit.hash === GitBlame.blank;
    }

    private static blank: string = "0000000000000000000000000000000000000000";
    private readonly disposable: Disposable;
    private readonly statusBarView: StatusBarView;
    private readonly files: Map<string, GitFile> = new Map();

    constructor() {
        this.statusBarView = StatusBarView.getInstance();

        const disposables = [ this.statusBarView ];

        this.setupDisposables(disposables);
        this.setupListeners(disposables);

        this.disposable = Disposable.from(...disposables);

        this.init();
    }

    public async blameLink(): Promise<void> {
        const commitInfo = await this.getCommitInfo();
        const commitToolUrl = this.getToolUrl(commitInfo);

        if (commitToolUrl) {
            commands.executeCommand("vscode.open", commitToolUrl);
        } else {
            window.showErrorMessage(
                Translation.do("error.missing_url"),
            );
        }
    }

    public async showMessage(): Promise<void> {
        const commitInfo = await this.getCommitInfo();

        if (GitBlame.isBlankCommit(commitInfo)) {
            this.clearView();
            return;
        }

        const messageFormat = getProperty(Properties.InfoMessageFormat);
        const normalizedTokens = TextDecorator.normalizeCommitInfoTokens(
            commitInfo,
        );
        const message = TextDecorator.parseTokens(
            messageFormat,
            normalizedTokens,
        );
        const extraActions = this.generateMessageActions(commitInfo);

        this.updateView(commitInfo);

        const actionedItem = await window.showInformationMessage(
            message,
            ...(await extraActions),
        );

        if (actionedItem) {
            actionedItem.takeAction();
        }
    }

    public defaultWebPath(
        url: string,
        hash: string,
        isPlural: boolean,
    ): string {
        const commit = isPlural ? "commits" : "commit";
        const gitUrlMatch = /^(git@|https:\/\/)([^:\/]+)[:\/](.*)\.git$/;
        const templatePath = `https://$2/$3/${ commit }/${ hash }`;

        return url.replace(gitUrlMatch, templatePath);
    }

    public dispose(): void {
        Disposable.from(...this.files.values()).dispose();
        this.disposable.dispose();
    }

    private setupDisposables(disposable: Disposable[]): void {
        // The blamer does not use the ErrorHandler but
        // is responsible for keeping it disposable
        disposable.push(ErrorHandler.getInstance());
    }

    private setupListeners(disposable: Disposable[]): void {
        window.onDidChangeActiveTextEditor(
            this.onTextEditorMove,
            this,
            disposable,
        );
        window.onDidChangeTextEditorSelection(
            this.onTextEditorMove,
            this,
            disposable,
        );
        workspace.onDidSaveTextDocument(
            this.onTextEditorMove,
            this,
            disposable,
        );
    }

    private init(): void {
        this.onTextEditorMove();
    }

    private async onTextEditorMove(): Promise<void> {
        const beforeBlameOpenFile = this.getCurrentActiveFileName();
        const beforeBlameLineNumber = this.getCurrentActiveLineNumber();
        const commitInfo = await this.getCurrentLineInfo();

        // Only update if we haven't moved since we started blaming
        if (
            beforeBlameOpenFile === this.getCurrentActiveFileName() &&
            beforeBlameLineNumber === this.getCurrentActiveLineNumber()
        ) {
            this.updateView(commitInfo);
        }
    }

    private getCurrentActiveFileName(): string {
        return (
            window.activeTextEditor && window.activeTextEditor.document.fileName
        );
    }

    private getCurrentActiveLineNumber(): number {
        return (
            window.activeTextEditor &&
            window.activeTextEditor.selection.active.line
        );
    }

    private async generateMessageActions(
        commitInfo: IGitCommitInfo,
    ): Promise<ActionableMessageItem[]> {
        const commitToolUrl = await this.getToolUrl(commitInfo);
        const extraActions: ActionableMessageItem[] = [];

        if (commitToolUrl) {
            const viewOnlineAction = new ActionableMessageItem(
                Translation.do("title.view_online"),
            );

            viewOnlineAction.setAction(() => {
                commands.executeCommand("vscode.open", commitToolUrl);
            });

            extraActions.push(viewOnlineAction);
        }

        return extraActions;
    }

    private async getCommitInfo(): Promise<IGitCommitInfo> {
        const commitInfo = await this.getCurrentLineInfo();

        if (commitInfo.generated) {
            window.showErrorMessage(
                Translation.do("error.unblameable"),
            );
        }

        return commitInfo;
    }

    private async getToolUrl(commitInfo: IGitCommitInfo): Promise<Uri> {
        if (GitBlame.isBlankCommit(commitInfo)) {
            return;
        }

        const parsedUrl = TextDecorator.parseTokens(
            getProperty(Properties.CommitUrl),
            {
                hash: commitInfo.hash,
            },
        );

        if (isWebUri(parsedUrl)) {
            return Uri.parse(parsedUrl);
        } else if (parsedUrl === "guess") {
            const isWebPathPlural = getProperty(Properties.IsWebPathPlural);
            const origin = await this.getOriginOfActiveFile();
            if (origin) {
                const uri = this.defaultWebPath(
                    origin,
                    commitInfo.hash,
                    isWebPathPlural,
                );
                return Uri.parse(uri);
            }
        } else if (parsedUrl !== "no") {
            window.showErrorMessage(
                Translation.do("error.invalid_url"),
            );
        }
    }

    private updateView(commitInfo: IGitCommitInfo): void {
        if (commitInfo.generated) {
            this.clearView();
        } else {
            this.statusBarView.update(commitInfo);
        }
    }

    private clearView() {
        this.statusBarView.clear();
    }

    private async getBlameInfo(fileName: string): Promise<IGitBlameInfo> {
        if (!this.files.has(fileName)) {
            this.files.set(
                fileName,
                GitFileFactory.create(
                    Uri.file(fileName),
                    this.generateDisposeable(fileName),
                ),
            );
        }

        return this.files.get(fileName).blame();
    }

    private async getCurrentLineInfo(): Promise<IGitCommitInfo> {
        if (isActiveEditorValid()) {
            return this.getLineInfo(
                window.activeTextEditor.document.fileName,
                window.activeTextEditor.selection.active.line,
            );
        } else {
            return GitBlame.blankCommitInfo();
        }
    }

    private async getLineInfo(
        fileName: string,
        lineNumber: number,
    ): Promise<IGitCommitInfo> {
        const commitLineNumber = lineNumber + 1;
        const blameInfo = await this.getBlameInfo(fileName);

        if (blameInfo.lines[commitLineNumber]) {
            const hash = blameInfo.lines[commitLineNumber];
            return blameInfo.commits[hash];
        } else {
            return GitBlame.blankCommitInfo();
        }
    }

    private async getOriginOfActiveFile(): Promise<string> {
        if (!isActiveEditorValid()) {
            return;
        }

        const gitCommand = await getGitCommand();
        const activeFile = window.activeTextEditor.document.fileName;
        const activeFileFolder = dirname(activeFile);
        const originUrl = await execute(gitCommand, [
            "ls-remote",
            "--get-url",
            "origin",
        ], {
            cwd: activeFileFolder,
        });

        return originUrl.trim();
    }

    private generateDisposeable(fileName): Disposable {
        return new Disposable(() => {
            this.files.delete(fileName);
        });
    }
}
