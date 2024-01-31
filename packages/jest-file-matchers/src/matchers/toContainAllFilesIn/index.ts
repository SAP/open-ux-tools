import { compareSync } from 'dir-compare';
import fs from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import type { MatcherOptions } from '../types';

/**
 * Matcher to assert that `receivedFolder` contains all the files in  the `expectedFolder`.
 *
 * @param receivedFolder path to received folder
 * @param expectedFolder path to expected folder
 * @param options additional options for matching
 * @returns results for custom matcher
 */
export function toContainAllFilesIn(
    receivedFolder: string,
    expectedFolder: string,
    options?: MatcherOptions
): jest.CustomMatcherResult {
    let pass = true;
    const messages: string[] = [];

    // `isNot` handles the `.not` case. The meaning of `pass` will be inverted in this case
    const { isNot, snapshotState } = this as jest.MatcherContext;

    // Do not update snapshots for `.not` case
    const updateSnapshot = !isNot && snapshotState._updateSnapshot === 'all';

    // Get files missing in the  received folder
    const includeFilter = options?.include?.join(',');
    const excludeFilter = options?.exclude?.join(',');
    const result = compareSync(receivedFolder, expectedFolder, { includeFilter, excludeFilter });
    if (result.differences > 0) {
        result.diffSet
            ?.filter((d) => d.state === 'right' && d.type1 === 'missing')
            .forEach((d, i) => {
                const missingFile = join(d.path2, d.name2);
                if (updateSnapshot) {
                    pass = true;
                    fs.unlinkSync(missingFile);
                    snapshotState.updated++; // We don't have a count of `deleted`
                } else {
                    pass = false;
                    if (!isNot) {
                        if (i === 0) {
                            messages.push(chalk.red('Missing in actual folder (pass update flag to delete snapshot):'));
                        }
                        messages.push(chalk.bold.red(`● ${missingFile}`));
                    }
                }
            });
    } else {
        pass = true;
        if (isNot) {
            messages.push(chalk.red('Expected filenames not to match in folders'));
        }
    }

    return { pass, message: () => messages.join('\n') };
}
