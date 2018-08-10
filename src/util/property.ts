import { workspace } from "vscode";

export enum Properties {
    CommitUrl = "commitUrl",
    IgnoreWhitespace = "ignoreWhitespace",
    InfoMessageFormat = "infoMessageFormat",
    IsWebPathPlural = "isWebPathPlural",
    StatusBarMessageFormat = "statusBarMessageFormat",
    StatusBarMessageNoCommit = "statusBarMessageNoCommit",
    StatusBarPositionPriority = "statusBarPositionPriority",
}

export function getProperty(
    property:
        Properties.CommitUrl |
        Properties.InfoMessageFormat |
        Properties.StatusBarMessageFormat |
        Properties.StatusBarMessageNoCommit,
): string;
export function getProperty(
    property:
        Properties.IgnoreWhitespace |
        Properties.IsWebPathPlural,
): boolean;
export function getProperty(
    property: Properties.StatusBarPositionPriority,
): number;
export function getProperty(
    property: Properties,
): string | boolean | number {
    const properties = workspace.getConfiguration("gitblame");
    return properties.get(property);
}
