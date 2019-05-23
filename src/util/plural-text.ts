export function pluralText(
    count: number,
    singular: string,
    plural: string,
): string {
    if (count === 1) {
        return `${ count } ${ singular }`;
    }

    return `${ count } ${ plural }`;
}
