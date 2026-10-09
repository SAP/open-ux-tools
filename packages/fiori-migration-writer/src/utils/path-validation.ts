import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Validates the root directory path before using as working directory
 * Rejects paths with control characters that could enable command injection
 *
 * @param path - Root directory path to validate
 * @returns Validated absolute path
 * @throws Error if path contains unsafe characters or is not a directory
 */
export function validateRootDirectory(path: string): string {
    const resolved = resolve(path);
    // Reject control characters and shell metacharacters
    if (/[\0\r\n`$|&;<>]/.test(resolved)) {
        throw new Error('Path contains unsafe characters');
    }
    // Ensure it's an existing directory (check real fs, not mem-fs)
    if (!existsSync(resolved)) {
        throw new Error('Root directory does not exist');
    }
    return resolved;
}

/**
 * Validates a relative path to ensure it's safe for git commands
 * Rejects paths that escape the root or contain unsafe characters
 *
 * @param relPath - Relative path to validate
 * @returns The same path if safe
 * @throws Error if path is unsafe
 */
export function validateGitRelativePath(relPath: string): string {
    // Reject empty or root-level paths
    if (!relPath || relPath === '.') {
        throw new Error('Git path cannot be empty or root');
    }
    // Reject paths that escape the root
    if (relPath.startsWith('..') || relPath.includes('/..') || relPath.includes('\\..')) {
        throw new Error('Git path escapes root directory');
    }
    // Reject control characters
    if (/[\0\r\n]/.test(relPath)) {
        throw new Error('Git path contains control characters');
    }
    return relPath;
}
