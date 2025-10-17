import fs from 'fs';
import { basename, join, dirname } from 'path';
import { diffJson, diffTrimmedLines } from 'diff';
import type { Change } from 'diff';
import { green, red } from 'chalk';
import { AssertionValueFunctionContext, AssertionValueFunctionResult } from 'promptfoo';
import { FOLDER_PATHS } from '../types';

interface SnapshotData {
    content: {
        snapshot: string;
        source: string;
    };
    created: boolean;
}

interface SnapshotSegmentConfig {
    path: Array<string>;
    mode: string;
}

interface SnapshotConfiguration {
    snapshot: string;
    file: string;
    segments?: SnapshotSegmentConfig[];
}

function getProjectPath(vars: Record<string, string | object>): string | undefined {
    return vars.PROJECT_PATH && typeof vars.PROJECT_PATH === 'string' ? vars.PROJECT_PATH : undefined;
}

function getSnapshotData(projectPath: string, key: string, targetPath: string): SnapshotData {
    let snapshotFolder = join(FOLDER_PATHS.snapshots, key);
    const relativeFolder = dirname(join(targetPath));
    if (relativeFolder) {
        snapshotFolder = join(snapshotFolder, relativeFolder);
    }
    // Make sure snapshot folder exists
    if (!fs.existsSync(snapshotFolder)) {
        fs.mkdirSync(snapshotFolder, { recursive: true });
    }
    // Check target file
    const filePath = join(projectPath, targetPath);
    if (!fs.existsSync(filePath)) {
        throw new Error(`${filePath} does not exists`);
    }
    const fileName = basename(filePath);
    const snapshotFile = join(snapshotFolder, fileName);
    let created = false;
    if (!fs.existsSync(snapshotFile)) {
        // Write snapshot
        fs.copyFileSync(filePath, snapshotFile);
        created = true;
    }
    const sourceContent = fs.readFileSync(filePath, 'utf8');
    const snapshotContent = fs.readFileSync(snapshotFile, 'utf8');
    return {
        content: {
            snapshot: snapshotContent,
            source: sourceContent
        },
        created
    };
}

function getConfiguration(config: Record<string, any>): SnapshotConfiguration | undefined {
    if (
        'file' in config &&
        typeof config.file === 'string' &&
        'snapshot' in config &&
        typeof config.snapshot === 'string'
    ) {
        let segments: SnapshotSegmentConfig[] | undefined;
        if ('segments' in config && Array.isArray(config.segments)) {
            segments = config.segments.filter((segment) => typeof segment === 'object' && 'path' in segment);
        }
        return {
            snapshot: config.snapshot,
            file: config.file,
            segments
        };
    }
}

function validateSnapshot(snapshotData: SnapshotData, config: SnapshotConfiguration): string | undefined {
    let compareResult: string | undefined;
    if (config.segments && config.file.endsWith('.json')) {
        const actual = JSON.parse(snapshotData.content.source);
        const snapshot = JSON.parse(snapshotData.content.snapshot);
        for (const segement of config.segments) {
            const actualSegment = getByPath(actual, segement.path);
            const snapshotSegment = getByPath(snapshot, segement.path);
            if (
                actualSegment !== null &&
                snapshotSegment !== null &&
                typeof actualSegment === 'object' &&
                typeof snapshotSegment === 'object'
            ) {
                if (segement.mode === 'contains') {
                    compareResult = deepContains(snapshotSegment, actualSegment);
                } else {
                    compareResult = compareJson(actualSegment, snapshotSegment);
                }
            } else {
                compareResult =
                    actualSegment === snapshotSegment ? undefined : `Value differs for ${segement.path.join('/')}`;
            }
            if (compareResult !== undefined) {
                break;
            }
        }
    } else {
        compareResult = config.file.endsWith('.json')
            ? compareJson(snapshotData.content.source, snapshotData.content.snapshot)
            : compareStrings(snapshotData.content.source, snapshotData.content.snapshot);
    }
    return compareResult;
}

/**
 * The function receives these arguments:
 * @param output the model output string
 * @param context context data, like test vars etc.
 * @returns Result of assertion.
 */
export function customAssert(output: string, context: AssertionValueFunctionContext): AssertionValueFunctionResult {
    let reason = 'Unknown';
    let pass = false;
    const projectPath = getProjectPath(context.vars);
    const config = context.config ? getConfiguration(context.config) : undefined;
    if (projectPath && config) {
        try {
            const snapshotData = getSnapshotData(projectPath, config.snapshot, config.file);
            const compareResult = validateSnapshot(snapshotData, config);
            pass = !compareResult;
            if (!pass) {
                console.log(`Snapshot mismatch for ${config.file}:\n${compareResult}`);
            }
            reason = pass ? 'Snapshot file matches' : `Snapshot file does not match: ${compareResult}`;
        } catch (e) {
            return {
                pass: false,
                score: 0,
                reason: e.message
            };
        }
    }

    return {
        pass,
        score: pass ? 1 : 0,
        reason
    };
}

/**
 * Safely gets a nested value from an object using a path array.
 * Supports `*` as a wildcard to map over array elements.
 */
export function getByPath(obj: unknown, path: (string | number)[]): unknown {
    if (!Array.isArray(path)) return undefined;

    let current: unknown = obj;

    for (let i = 0; i < path.length; i++) {
        const key = path[i];
        // Ensure current is an object or array before trying to access properties
        if (
            current === null ||
            typeof current !== 'object' ||
            !(key in (current as Record<string | number, unknown>))
        ) {
            return undefined;
        }

        current = (current as Record<string | number, unknown>)[key];
    }

    return current;
}

/**
 * Compare two json files.
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 */
export function compareJson(a: string | object, b: string | object): string | undefined {
    const diffChanges = diffJson(a, b);
    const diffResultString = getDiffResultString(diffChanges);
    return diffResultString ? diffResultString : undefined;
}

export function deepContains(expected: unknown, actual: unknown, path = ''): string | undefined {
    // Handle primitive values (and null)
    if (typeof expected !== 'object' || expected === null || typeof actual !== 'object' || actual === null) {
        return Object.is(expected, actual) ? undefined : `Mismatch at ${path}: expected ${expected}, got ${actual}`;
    }

    // At this point both are non-null objects
    const expectedObj = expected as Record<string, unknown>;
    const actualObj = actual as Record<string, unknown>;

    for (const key of Object.keys(expectedObj)) {
        if (!(key in actualObj)) {
            return `Missing key at ${path}.${key}`;
        }

        const result = deepContains(expectedObj[key], actualObj[key], `${path}.${key}`);
        if (result) return result;
    }

    // Ignore extra keys in `actual`
    return undefined;
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
