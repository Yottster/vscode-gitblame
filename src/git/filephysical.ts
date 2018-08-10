import { dirname, normalize } from "path";

import { Disposable, FileSystemWatcher, Uri, workspace } from "vscode";

import { IGitBlameInfo, IGitCommitInfo } from "../interfaces";
import { ErrorHandler } from "../util/errorhandler";
import { execute } from "../util/execcommand";
import { getGitCommand } from "../util/gitcommand";
import { Translation } from "../util/translation";
import { StatusBarView } from "../view";
import { GitBlame } from "./blame";
import { GitFile } from "./file";
import { GitBlameStream } from "./stream";

export class GitFilePhysical extends GitFile {
    private blameInfoPromise: Promise<IGitBlameInfo>;
    private readonly fileSystemWatcher: FileSystemWatcher;
    private workTree: string;
    private workTreePromise: Promise<string>;
    private blameProcess: GitBlameStream;

    constructor(fileName: Uri, disposable: Disposable) {
        super(fileName, disposable);

        this.fileSystemWatcher = this.setupWatcher();
    }

    public blame(): Promise<IGitBlameInfo> {
        StatusBarView.getInstance().startProgress();

        if (this.blameInfoPromise) {
            return this.blameInfoPromise;
        } else {
            return this.findBlameInfo();
        }
    }

    public dispose(): void {
        super.dispose();
        if (this.blameProcess) {
            this.blameProcess.terminate();
            delete this.blameProcess;
        }
        this.fileSystemWatcher.dispose();
    }

    private setupWatcher(): FileSystemWatcher {
        const relativePath = workspace.asRelativePath(this.fileName);
        const fsWatcher = workspace.createFileSystemWatcher(
            relativePath,
            true,
            false,
            false,
        );

        fsWatcher.onDidChange(() => {
            this.changed();
        });
        fsWatcher.onDidDelete(() => {
            this.dispose();
        });

        return fsWatcher;
    }

    private changed(): void {
        delete this.workTree;
        delete this.blameInfoPromise;
    }

    private async getGitWorkTree(): Promise<string> {
        if (this.workTree) {
            return this.workTree;
        }

        if (!this.workTreePromise) {
            this.workTreePromise = this.findWorkTree();
        }

        this.workTree = await this.workTreePromise;

        return this.workTree;
    }

    private async findWorkTree(): Promise<string> {
        const workTree = await this.executeGitRevParseCommand(
            "--show-toplevel",
        );

        if (workTree === "") {
            return "";
        } else {
            return normalize(workTree);
        }
    }

    private async executeGitRevParseCommand(command: string): Promise<string> {
        const currentDirectory = dirname(this.fileName.fsPath);
        const gitCommand = await getGitCommand();
        const gitExecArguments = ["rev-parse", command];
        const gitExecOptions = {
            cwd: currentDirectory,
        };
        const gitRev = await execute(
            gitCommand,
            gitExecArguments,
            gitExecOptions,
        );

        return gitRev.trim();
    }

    private async findBlameInfo(): Promise<IGitBlameInfo> {
        const workTree = await this.getGitWorkTree();
        const blameInfo = GitBlame.blankBlameInfo();

        if (workTree && !this.blameInfoPromise) {
            this.blameInfoPromise = new Promise<IGitBlameInfo>(
                (resolve) => {
                    this.blameProcess = new GitBlameStream(
                        this.fileName,
                        workTree,
                    );

                    this.blameProcess.on(
                        "commit",
                        this.addCommit(blameInfo),
                    );
                    this.blameProcess.on(
                        "line",
                        this.addLine(blameInfo),
                    );
                    this.blameProcess.on(
                        "end",
                        this.streamOver(
                            this.blameProcess,
                            resolve,
                            blameInfo,
                        ),
                    );
                },
            );
        } else if (!workTree) {
            this.startCacheInterval();
            ErrorHandler.logInfo(
                Translation.do("info.file_not_git", this.fileName.fsPath),
            );
            this.blameInfoPromise = Promise.resolve(blameInfo);
        }

        return this.blameInfoPromise;
    }

    private addCommit(
        blameInfo: IGitBlameInfo,
    ): (internalHash: string, data: IGitCommitInfo) => void {
        return (internalHash, data) => {
            blameInfo.commits[internalHash] = data;
        };
    }

    private addLine(
        blameInfo: IGitBlameInfo,
    ): (line: number, gitCommitHash: string) => void {
        return (line: number, gitCommitHash: string) => {
            blameInfo.lines[line] = gitCommitHash;
        };
    }

    private streamOver(
        gitStream,
        resolve: (val: any) => void,
        blameInfo: IGitBlameInfo,
    ): (err: Error) => void {
        return (err: Error) => {
            gitStream.removeAllListeners();
            this.startCacheInterval();

            if (err) {
                ErrorHandler.logError(err);
                resolve(GitBlame.blankBlameInfo());
            } else {
                ErrorHandler.logInfo(
                    Translation.do(
                        "info.file_blamed",
                        this.fileName.fsPath,
                        Object.keys(blameInfo.commits).length,
                    ),
                );
                resolve(blameInfo);
            }
        };
    }
}
