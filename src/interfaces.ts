export interface IGitCommitAuthor {
    name: string;
    mail: string;
    timestamp: number;
    tz: string;
}

export interface IGitCommitInfo {
    hash: string;
    author: IGitCommitAuthor;
    committer: IGitCommitAuthor;
    summary: string;
    filename: string;
    generated: boolean;
}

export interface IGitBlameInfo {
    commits: { [hash: string]: IGitCommitInfo; };
    lines: { [lineNumber: number]: string; };
}

export interface IInfoTokenNormalizedCommitInfo {
    author: IGitCommitAuthor;
    commit: {
        filename: string;
        hash: string;
        hash_short: (length: number) => string;
        summary: string;
    };
    committer: IGitCommitAuthor;
    time: {
        ago: () => string;
        c_ago: () => string;
        c_custom: (momentFormat: string) => string;
        c_from: () => string;
        custom: (momentFormat: string) => string;
        from: () => string;
    };
}
