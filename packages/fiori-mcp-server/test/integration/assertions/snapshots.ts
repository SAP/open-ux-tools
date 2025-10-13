import fs from 'fs';
import { basename, join, dirname } from 'path';
import { diffJson, diffTrimmedLines } from 'diff';
import type { Change } from 'diff';
import { green, grey, red } from 'chalk';

/**
 * The function receives these arguments:
 * @param {string} output — the model output string
 * @param {object} context — extra metadata, like test vars etc.
 * @returns { { pass: boolean, reason?: string } | Promise<{pass, reason}> }
 */
export function customAssert(output: string, context: any) {
    let reason = 'Unknown';
    let pass = false;
    if (
        context.vars.PROJECT_PATH &&
        'config' in context &&
        typeof context.config === 'object' &&
        'file' in context.config &&
        typeof context.config.file === 'string' &&
        'snapshot' in context.config &&
        typeof context.config.snapshot === 'string'
    ) {
        let snapshotFolder = join(__dirname, 'snapshots', context.config.snapshot);
        const relativeFolder = dirname(join(context.config.file));
        if (relativeFolder) {
            snapshotFolder = join(snapshotFolder, relativeFolder);
        }
        // Make sure snapshot folder exists
        if (!fs.existsSync(snapshotFolder)) {
            fs.mkdirSync(snapshotFolder, { recursive: true });
        }
        // Check target file
        const filePath = join(context.vars.PROJECT_PATH, context.config.file);
        if (!fs.existsSync(filePath)) {
            return {
                pass: false,
                score: 0,
                reason: `${filePath} does not exists`
            };
        }
        const fileName = basename(filePath);
        const snapshotFile = join(snapshotFolder, fileName);
        if (!fs.existsSync(snapshotFile)) {
            // Write snapshot
            fs.copyFileSync(filePath, snapshotFile);
            pass = true;
            reason = 'Snapshot file is created';
        } else {
            // validate
            const sourceContent = fs.readFileSync(filePath, 'utf8');
            const snapshotContent = fs.readFileSync(snapshotFile, 'utf8');
            const compareResult = filePath.endsWith('.json')
                ? compareJson(sourceContent, snapshotContent)
                : compareStrings(sourceContent, snapshotContent);
            pass = !compareResult;
            if (!pass) {
                console.log(`Snapshot mismatch for ${snapshotFile}:\n${compareResult}`);
            }
            reason = pass ? 'Snapshot file matches' : `Snapshot file does not match: ${compareResult}`;
        }
    }

    return {
        pass,
        score: pass ? 1 : 0,
        reason
    };
}

/**
 * Compare two json files.
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 */
export function compareJson(a: string, b: string): string | undefined {
    const diffChanges = diffJson(a, b);
    const diffResultString = getDiffResultString(diffChanges);
    return diffResultString ? diffResultString : undefined;
}

/**
 * Compare two strings.
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 */
export function compareStrings(a: string, b: string): string | undefined {
    const diffChanges = diffTrimmedLines(a, b);
    const diffResultString = getDiffResultString(diffChanges);
    return diffResultString ? diffResultString : undefined;
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
        }
    }
    return diffResults;
}
