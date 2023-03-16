import { green, grey, red } from 'chalk';
import type { Change } from 'diff';
import { diffJson, diffTrimmedLines } from 'diff';
import { getLogger } from './logger';

/**
 * Compare two json files.
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 */
export function compareJson(a: object, b: object): void {
    const logger = getLogger();
    const diffChanges = diffJson(a, b);
    const diffResultString = getDiffResultString(diffChanges);
    logger.debug(`File changes:\n${diffResultString}`);
}

/**
 * Compare two strings.
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 */
export function compareStrings(a: string, b: string): void {
    const logger = getLogger();
    const diffChanges = diffTrimmedLines(a, b);
    const diffResultString = getDiffResultString(diffChanges);
    logger.debug(`File changes:\n${diffResultString}`);
}

/**
 * Get the diff results as colored string.
 *
 * @param diffChanges - array of changes, result from diff
 * @returns - diff results as colored string
 */
function getDiffResultString(diffChanges: Change[]): string {
    let diffResults: string = '';
    for (const diffChange of diffChanges) {
        if (diffChange.added) {
            diffResults += green(diffChange.value);
        } else if (diffChange.removed) {
            diffResults += red(diffChange.value);
        } else {
            diffResults += grey(diffChange.value);
        }
    }
    return diffResults;
}
