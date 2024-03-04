import { toMatchFile } from '../toMatchFileSnapshot';
import fs from 'fs';
import { join } from 'path';
import minimatch = require('minimatch');
import type { Filter, MatcherOptions } from '../types';
import { extractMessage } from '../utils';

/**
 * Matcher to assert the content of files in `receivedFolder` match the contents of
 * files with the same relative path name in `expectedFolder`.
 *
 * @param receivedFolder path to received folder
 * @param expectedFolder path to expected folder
 * @param options additional options for matching
 * @returns results for custom matcher
 */
export function toMatchFilesIn(
    receivedFolder: string,
    expectedFolder: string,
    options?: MatcherOptions
): jest.CustomMatcherResult {
    const messages: string[] = [];
    let pass = true;

    const toMatchFileSnapshot = toMatchFile.bind(this);

    getAllFileNames({ dir: receivedFolder, filter: options }).forEach((fileName) => {
        const snapshotFilename = fileName.replace(receivedFolder, expectedFolder);
        const fileContents = fs.readFileSync(fileName, 'utf-8').replace(/\r\n/g, '\n');

        const { pass: snapshotPass, message: getMessage } = toMatchFileSnapshot(
            fileContents,
            snapshotFilename,
            options
        );

        pass = pass && snapshotPass;
        extractMessage({ getMessage, messages });
    });

    return { pass, message: () => messages.join('\n') };
}

/**
 * Determines whether a filepath should be included based on a list of glob patterns.
 *
 * @param filepath the filepath to check for inclusion.
 * @param globs an optional array of glob patterns used for inclusion. If not provided or empty, no inclusion filtering will be applied.
 * @returns returns true if the filepath matches any of the glob patterns and should be excluded, otherwise returns false.
 */
function include(filepath: string, globs?: string[]): boolean {
    if (!globs || globs.length === 0) {
        // no filter
        return true;
    }
    return globs.some((p) => minimatch(filepath, p));
}

/**
 * Determines whether a filepath should be excluded based on a list of glob patterns.
 *
 * @param filepath the filepath to check for exclusion.
 * @param globs an optional array of glob patterns used for exclusion. If not provided or empty, no exclusion filtering will be applied.
 * @returns returns true if the filepath matches any of the glob patterns and should be excluded, otherwise returns false.
 */
function exclude(filepath: string, globs?: string[]): boolean {
    if (!globs || globs.length === 0) {
        // no filter
        return false;
    }
    return globs.some((p) => minimatch(filepath, p));
}

/**
 * Get all the names of files under a directory, recursively.
 *
 * @param options object containing directory and optional filter.
 * @param options.dir directory path
 * @param options.filter optional filter to include/exclude files
 * @returns array of file names
 */
function getAllFileNames({ dir, filter }: { dir: string; filter?: Filter }): string[] {
    const fileNames: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries
        .filter((e) => {
            if (e.isDirectory()) {
                return false;
            } else {
                const filePath = join(dir, e.name);
                return include(filePath, filter?.include) && !exclude(filePath, filter?.exclude);
            }
        })
        .forEach((f) => fileNames.push(join(dir, f.name)));

    entries
        .filter((e) => e.isDirectory())
        .forEach((d) => fileNames.push(...getAllFileNames({ dir: join(dir, d.name), filter })));

    return fileNames;
}
