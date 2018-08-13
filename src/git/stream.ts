import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";

import { Uri } from "vscode";

import { IGitCommitAuthor, IGitCommitInfo } from "../interfaces";
import { ErrorHandler } from "../util/errorhandler";
import { getGitCommand } from "../util/gitcommand";
import { getProperty, Properties } from "../util/property";
import { GitBlame } from "./blame";

export class GitBlameStream extends EventEmitter {
    private static readonly HASH_PATTERN: RegExp = /[a-z0-9]{40}/;

    private readonly file: Uri;
    private readonly workTree: string;
    private process: ChildProcess;
    private readonly emittedCommits: { [hash: string]: true } = {};

    constructor(file: Uri, workTree: string) {
        super();

        this.file = file;
        this.workTree = workTree;

        getGitCommand().then((gitCommand) => {
            const args = this.generateArguments();
            const spawnOptions = {
                cwd: workTree,
            };

            ErrorHandler.logCommand(
                `${gitCommand} ${args.join(" ")}`,
            );

            this.process = spawn(gitCommand, args, spawnOptions);

            this.setupListeners();
        });
    }

    public terminate(): void {
        this.dispose();
    }

    public dispose(): void {
        this.process.kill("SIGKILL");
        this.process.removeAllListeners();
        this.process.stderr.removeAllListeners();
        this.process.stdout.removeAllListeners();
    }

    private generateArguments(): string[] {
        const processArguments = [];

        processArguments.push("blame");

        if (getProperty(Properties.IgnoreWhitespace)) {
            processArguments.push("-w");
        }

        processArguments.push("--incremental");
        processArguments.push("--");
        processArguments.push(this.file.fsPath);

        return processArguments;
    }

    private setupListeners(): void {
        this.process.addListener("close", () => this.close());
        this.process.stdout.addListener("data", (chunk) => {
            this.data(chunk.toString());
        });
        this.process.stderr.addListener("data", (error: Error) =>
            this.close(error),
        );
    }

    private close(err: Error = null): void {
        this.emit("end", err);
    }

    private data(dataChunk: string): void {
        const lines = dataChunk.split("\n");
        let commitInfo = GitBlame.blankCommitInfo();

        commitInfo.filename = this.file.fsPath.replace(this.workTree, "");

        lines.forEach((line, index) => {
            if (line && line !== "boundary") {
                const [, key, value] = line.match(/(.*?) (.*)/);

                if (this.isNewCommit(key, lines, index, commitInfo)) {
                    this.commitInfoToCommitEmit(commitInfo);
                    commitInfo = GitBlame.blankCommitInfo(true);
                    commitInfo.filename = this.file.fsPath.replace(
                        this.workTree,
                        "",
                    );
                }

                this.processLine(key, value, commitInfo);
            }
        });

        this.commitInfoToCommitEmit(commitInfo);
    }

    private isNewCommit(
        key: string,
        lines: string[],
        index: number,
        commitInfo: IGitCommitInfo,
    ): boolean {
        return commitInfo.hash !== "" &&
            lines.hasOwnProperty(index + 1) &&
            GitBlameStream.HASH_PATTERN.test(key) &&
            /^(author|committer)/.test(lines[index + 1]);
    }

    private processLine(
        key: string,
        value: string,
        commitInfo: IGitCommitInfo,
    ): void {
        if (key === "summary") {
            commitInfo.summary = value;
        } else if (GitBlameStream.HASH_PATTERN.test(key)) {
            commitInfo.hash = key;

            const [, finalLine, lines] = value.split(" ");

            this.lineGroupToLineEmit(
                commitInfo.hash,
                parseInt(lines, 10),
                parseInt(finalLine, 10),
            );
        } else {
            const [who, what] = key.split("-");

            if (who === "author") {
                this.processAuthor(commitInfo.author, what, value);
            } else if (who === "committer") {
                this.processAuthor(commitInfo.committer, what, value);
            }
        }
    }

    private processAuthor(
        who: IGitCommitAuthor,
        what: string,
        value: string,
    ): void {
        if (!what) {
            who.name = value;
        } else if (what === "mail") {
            who.mail = value;
        } else if (what === "tz") {
            who.tz = value;
        } else if (what === "time") {
            who.timestamp = parseInt(value, 10);
        }
    }

    private lineGroupToLineEmit(
        hash: string,
        lines: number,
        finalLine: number,
    ): void {
        for (let i = 0; i < lines; i++) {
            this.emit("line", finalLine + i, hash);
        }
    }

    private commitInfoToCommitEmit(commitInfo: IGitCommitInfo): void {
        const { hash } = commitInfo;
        if (!this.emittedCommits[hash]) {
            this.emittedCommits[hash] = true;
            this.emit("commit", hash, commitInfo);
        }
    }
}
