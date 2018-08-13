import * as moment from "moment";

import { GitBlame } from "../git/blame";
import {
    IGitCommitInfo,
    IInfoTokenNormalizedCommitInfo,
} from "../interfaces";
import { walkObject } from "./objectpath";
import { getProperty, Properties } from "./property";
import { Translation } from "./translation";

export class TextDecorator {
    public static toTextView(commit: IGitCommitInfo): string {
        if (GitBlame.isBlankCommit(commit)) {
            return getProperty(Properties.StatusBarMessageNoCommit);
        }

        const normalizedCommitInfo = TextDecorator.normalizeCommitInfoTokens(
            commit,
        );
        const messageFormat = getProperty(Properties.StatusBarMessageFormat);

        return TextDecorator.parseTokens(messageFormat, normalizedCommitInfo);
    }

    public static toDateText(dateNow: Date, dateThen: Date): string {
        const momentNow = moment(dateNow);
        const momentThen = moment(dateThen);

        const months = momentNow.diff(momentThen, "months");
        const days = momentNow.diff(momentThen, "days");
        const hours = momentNow.diff(momentThen, "hours");
        const minutes = momentNow.diff(momentThen, "minutes");

        if (minutes <= 4) {
            return Translation.do("time.right_now");
        } else if (minutes === 1) {
            return Translation.do("time.minute", minutes);
        } else if (minutes <= 70) {
            return Translation.do("time.minute_plural", minutes);
        } else if (hours === 1) {
            return Translation.do("time.hour", hours);
        } else if (hours <= 47) {
            return Translation.do("time.hour_plural", hours);
        } else if (days === 1) {
            return Translation.do("time.day", days);
        } else if (days <= 40) {
            return Translation.do("time.day_plural", days);
        } else if (months === 1) {
            return Translation.do("time.month", months);
        } else {
            return Translation.do("time.month_plural", months);
        }
    }

    public static parseTokens(
        target: string,
        tokens:
            IInfoTokenNormalizedCommitInfo |
            object,
    ): string {
        const tokenRegex = /\$\{([a-z\.\-\_]{1,})[,]*(|.{1,}?)(?=\})}/gi;

        if (typeof target !== "string") {
            return "";
        }

        return target.replace(
            tokenRegex,
            (path: string, key: string, inValue: string): string => {
                const currentToken = walkObject(tokens, key);
                const value = inValue.length > 0 ? inValue : undefined;
                const currentTokenType = typeof currentToken;

                if (currentTokenType === "string") {
                    return currentToken;
                } else if (currentTokenType === "number") {
                    return currentToken.toString();
                } else if (currentTokenType === "function") {
                    const newString = currentToken.call(this, value, key);
                    const newStringType = typeof newString;

                    if (newStringType === "string") {
                        return newString;
                    } else if (newStringType === "number") {
                        return newString.toString();
                    }
                }

                return key;
            },
        );
    }

    public static normalizeCommitInfoTokens(
        commitInfo: IGitCommitInfo,
    ): IInfoTokenNormalizedCommitInfo {
        const now = new Date();
        const authorTime = moment.unix(commitInfo.author.timestamp);
        const committerTime = moment.unix(commitInfo.committer.timestamp);

        return {
            author: commitInfo.author,
            commit: {
                filename: commitInfo.filename,
                hash: commitInfo.hash,
                hash_short: (length = 7) => commitInfo.hash.substr(0, length),
                summary: commitInfo.summary,
            },
            committer: commitInfo.committer,
            time: {
                ago: () => TextDecorator.toDateText(now, authorTime.toDate()),
                c_ago: () =>
                    TextDecorator.toDateText(now, committerTime.toDate()),
                c_custom: (momentFormat) => committerTime.format(momentFormat),
                c_from: () => committerTime.fromNow(),
                custom: (momentFormat) => authorTime.format(momentFormat),
                from: () => authorTime.fromNow(),
            },
        };
    }
}
