import { OutputChannel, window } from "vscode";

import { Properties, Property } from "./property";
import { Translation } from "./translation";

enum LogCategory {
    Info = "info",
    Error = "error",
    Command = "command",
    Critical = "critical",
}

export class ErrorHandler {
    public static logInfo(message: string) {
        ErrorHandler.getInstance().writeToLog(LogCategory.Info, message);
    }

    public static logCommand(message: string): void {
        ErrorHandler.getInstance().writeToLog(LogCategory.Command, message);
    }

    public static logError(error: Error): void {
        ErrorHandler.getInstance().writeToLog(
            LogCategory.Error,
            error.toString(),
        );
    }

    public static logCritical(error: Error, message: string): void {
        const instance = ErrorHandler.getInstance();
        instance.writeToLog(
            LogCategory.Critical,
            error.toString(),
        );
        instance.showErrorMessage(
            message,
        );
    }

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }

        return ErrorHandler.instance;
    }

    private static instance: ErrorHandler;

    private static timestamp(): string {
        const now = new Date();
        const hour = now
            .getHours()
            .toString()
            .padStart(2, "0");
        const minute = now
            .getMinutes()
            .toString()
            .padStart(2, "0");
        const second = now
            .getSeconds()
            .toString()
            .padStart(2, "0");

        return `${hour}:${minute}:${second}`;
    }

    private readonly outputChannel: OutputChannel;

    private constructor() {
        this.outputChannel = window.createOutputChannel("Extension: gitblame");
    }

    public dispose() {
        this.outputChannel.dispose();
    }

    private async showErrorMessage(message: string): Promise<void> {
        const showLog = Translation.do("title.show_log");
        const selectedItem = await window.showErrorMessage(
            message,
            showLog,
        );

        if (selectedItem === showLog) {
            this.outputChannel.show();
        }
    }

    private writeToLog(category: LogCategory, message: string): boolean {
        const allowCategory = this.logCategoryAllowed(category);

        if (allowCategory) {
            const trimmedMessage = message.trim();
            const timestamp = ErrorHandler.timestamp();
            this.outputChannel.appendLine(
                `[ ${timestamp} | ${category} ] ${trimmedMessage}`,
            );
        }

        return allowCategory;
    }

    private logCategoryAllowed(level: LogCategory): boolean {
        const enabledLevels = Property.get(Properties.LogLevel);

        return enabledLevels.includes(level);
    }
}
