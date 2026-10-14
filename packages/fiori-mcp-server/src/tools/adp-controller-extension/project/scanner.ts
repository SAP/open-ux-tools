import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { logger } from '../../../utils/logger.js';
import { MAX_SCANNED_FILE_SIZE, SCANNABLE_EXTENSIONS } from '../constants.js';
import { isChangeFile } from '../ai-response/parser.js';
import type { ExistingProjectFile } from '../types.js';

/**
 * Scans `webapp/changes` for existing controller extensions and fragments so
 * the model can extend them rather than create duplicates. Files exceeding
 * {@link MAX_SCANNED_FILE_SIZE} or with extensions outside
 * {@link SCANNABLE_EXTENSIONS} are skipped, as are `.change` files.
 *
 * @param appPath Adaptation project root directory.
 * @returns The collected files with paths relative to `appPath`.
 */
export function scanExistingProjectFiles(appPath: string): ExistingProjectFile[] {
    const changesDir = join(appPath, 'webapp', 'changes');
    if (!existsSync(changesDir)) {
        return [];
    }
    const files: ExistingProjectFile[] = [];
    collectFiles(changesDir, appPath, files);
    return files;
}

/**
 * Recursively walks `dir` and appends matching files to `files`.
 *
 * @param dir Directory to walk.
 * @param appPath Adaptation project root, used to compute relative paths.
 * @param files Accumulator the helper writes into.
 */
function collectFiles(dir: string, appPath: string, files: ExistingProjectFile[]): void {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            collectFiles(fullPath, appPath, files);
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const ext = extname(entry.name);
        if (!SCANNABLE_EXTENSIONS.has(ext) || isChangeFile(entry.name)) {
            continue;
        }

        try {
            const stat = statSync(fullPath);
            if (stat.size > MAX_SCANNED_FILE_SIZE) {
                continue;
            }
            const content = readFileSync(fullPath, 'utf-8');
            files.push({ relativePath: relative(appPath, fullPath), content });
        } catch {
            logger.debug(`Could not read file: ${fullPath}`);
        }
    }
}
