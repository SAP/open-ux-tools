import { toMatchFile } from '../toMatchFileSnapshot';
import fs from 'fs';
import { join } from 'path';
import minimatch = require('minimatch');
import type { Filter, MatcherOptions } from '../types';
import { extractMessage } from '../utils';

/**
 * Matcher to assert the content of files in `receivedFolder` match the contents of
 *  files with the same relative path name in `expectedFolder`
 */
export function toMatchFilesIn(
    receivedFolder: string,
    expectedFolder: string,
    options?: MatcherOptions
): jest.CustomMatcherResult {
    const messages: string[] = [];
    let pass = true;

    const toMatchFileSnaphot = toMatchFile.bind(this);
    //let { snapshotState } = this as jest.MatcherContext;

    getAllFileNames({ dir: receivedFolder, filter: options }).forEach((fileName) => {
        const snapshotFilename = fileName.replace(receivedFolder, expectedFolder);
        const fileContents = fs.readFileSync(fileName, 'utf-8').replace(/\r\n/g, '\n');

        const { pass: snapshotPass, message: getMessage } = toMatchFileSnaphot(fileContents, snapshotFilename, options);

        pass = pass && snapshotPass;
        extractMessage({ getMessage, messages });
    });

    return { pass, message: () => messages.join('\n' || '') };
}

function include(filepath: string, globs?: string[]): boolean {
    if (!globs || globs.length === 0) {
        // no filter
        return true;
    }
    return globs.some((p) => minimatch(filepath, p));
}

function exclude(filepath: string, globs?: string[]): boolean {
    if (!globs || globs.length === 0) {
        // no filter
        return false;
    }
    return globs.some((p) => minimatch(filepath, p));
}

/** Get all the names of files under a directory, recursively  */
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
