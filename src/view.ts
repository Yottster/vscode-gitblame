import { StatusBarAlignment, StatusBarItem, window } from "vscode";

import { GitBlame } from "./git/blame";
import { IGitCommitInfo } from "./interfaces";
import { Properties, Property } from "./util/property";
import { Spinner } from "./util/spinner";
import { TextDecorator } from "./util/textdecorator";
import { Translation } from "./util/translation";

export class StatusBarView {
    public static getInstance(): StatusBarView {
        if (!this.instance) {
            this.instance = new StatusBarView();
        }

        return this.instance;
    }

    private static instance: StatusBarView;
    private readonly statusBarItem: StatusBarItem;
    private progressInterval: NodeJS.Timer;
    private readonly spinner: Spinner;
    private spinnerActive: boolean = false;

    private constructor() {
        this.statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Left,
            Property.get(Properties.StatusBarPositionPriority),
        );
        this.spinner = new Spinner();
    }

    public clear(): void {
        this.stopProgress();
        this.setText("", false);
    }

    public update(commitInfo: IGitCommitInfo): void {
        this.stopProgress();

        if (commitInfo && !commitInfo.generated) {
            const clickable = !GitBlame.isBlankCommit(commitInfo);

            this.setText(TextDecorator.toTextView(commitInfo), clickable);
        } else {
            this.clear();
        }
    }

    public stopProgress(): void {
        clearInterval(this.progressInterval);
        this.spinnerActive = false;
    }

    public startProgress(): void {
        if (this.spinnerActive) {
            return;
        }

        this.stopProgress();

        if (this.spinner.updatable()) {
            this.progressInterval = setInterval(() => {
                this.setSpinner();
            }, 100);
        } else {
            this.setSpinner();
        }

        this.spinnerActive = true;
    }

    public dispose(): void {
        this.stopProgress();
        this.statusBarItem.dispose();
    }

    private setText(text: string, hasCommand: boolean = true): void {
        this.statusBarItem.text = text
            ? `$(git-commit) ${text}`
            : "$(git-commit)";
        this.statusBarItem.tooltip = hasCommand
            ? "git blame"
            : "git blame - " + Translation.do("info.no_info");
        this.statusBarItem.command = hasCommand ? "gitblame.quickInfo" : "";
        this.statusBarItem.show();
    }

    private setSpinner(): void {
        this.setText(
            this.spinner + " " + Translation.do("info.loading_info"),
            false,
        );
    }
}
