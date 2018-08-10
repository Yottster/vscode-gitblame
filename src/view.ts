import { StatusBarAlignment, StatusBarItem, window } from "vscode";

import { GitBlame } from "./git/blame";
import { IGitCommitInfo } from "./interfaces";
import { getProperty, Properties } from "./util/property";
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
    private readonly spinner: string = "$(sync~spin)";

    private constructor() {
        this.statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Left,
            getProperty(Properties.StatusBarPositionPriority),
        );
    }

    public clear(): void {
        this.setText("");
    }

    public update(commitInfo: IGitCommitInfo): void {
        if (commitInfo && !commitInfo.generated) {
            const clickable = !GitBlame.isBlankCommit(commitInfo);

            this.setText(TextDecorator.toTextView(commitInfo), clickable);
        } else {
            this.clear();
        }
    }

    public startProgress(): void {
        this.setText(this.spinner + " " + Translation.do("info.loading_info"));
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }

    private setText(text: string, hasCommand: boolean = false): void {
        if (text) {
            this.statusBarItem.text = `$(git-commit) ${ text }`;
        } else {
            this.statusBarItem.text = "$(git-commit)";
        }

        if (hasCommand) {
            this.statusBarItem.command = "gitblame.quickInfo";
            this.statusBarItem.tooltip = "git blame";
        } else {
            const noInfo = Translation.do("info.no_info");
            this.statusBarItem.command = "";
            this.statusBarItem.tooltip = "git blame - " + noInfo;
        }

        this.statusBarItem.show();
    }
}
