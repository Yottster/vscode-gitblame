import { Disposable, workspace } from "vscode";

export enum Properties {
    CommitUrl = "commitUrl",
    IgnoreWhitespace = "ignoreWhitespace",
    InfoMessageFormat = "infoMessageFormat",
    InternalHashLength = "internalHashLength",
    IsWebPathPlural = "isWebPathPlural",
    LogLevel = "logLevel",
    ProgressSpinner = "progressSpinner",
    StatusBarMessageFormat = "statusBarMessageFormat",
    StatusBarMessageNoCommit = "statusBarMessageNoCommit",
    StatusBarPositionPriority = "statusBarPositionPriority",
}

export class Property {
    public static get(
        property:
            Properties.CommitUrl |
            Properties.InfoMessageFormat |
            Properties.StatusBarMessageFormat |
            Properties.StatusBarMessageNoCommit,
    ): string;
    public static get(
        property:
            Properties.IgnoreWhitespace |
            Properties.IsWebPathPlural,
    ): boolean;
    public static get(
        property:
            Properties.InternalHashLength |
            Properties.StatusBarPositionPriority,
    ): number;
    public static get(
        property:
            Properties.LogLevel |
            Properties.ProgressSpinner,
    ): string[];
    public static get(
        property: Properties,
    ): string | boolean | number | string[];
    public static get(
        property: Properties,
    ): string | boolean | number | string[] {
        const properties = workspace.getConfiguration("gitblame");
        return properties.get(property);
    }
}
