import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Return whether a path is the root itself or a descendant of it.
 *
 * @param {string} root trusted root
 * @param {string} candidate path to validate
 * @returns {boolean} containment result
 */
export function isContainedPath(root, candidate) {
    const fromRoot = relative(resolve(root), resolve(candidate));
    return fromRoot === '' || (!fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot));
}

/**
 * Require an existing regular, non-symlinked file below an application root.
 *
 * @param {string} root application root
 * @param {string} filePath file path
 */
export function assertSafeExistingFile(root, filePath) {
    if (!isContainedPath(root, filePath)) {
        throw new Error(`Mutation target escapes the application root: ${filePath}`);
    }
    const info = lstatSync(filePath);
    if (info.isSymbolicLink() || !info.isFile()) {
        throw new Error(`Mutation target must be a regular non-symbolic-link file: ${filePath}`);
    }
}

/**
 * Hash file content, or return null when the file does not exist.
 *
 * @param {string} filePath file to hash
 * @returns {string|null} SHA-256 digest or null
 */
export function hashFile(filePath) {
    if (!existsSync(filePath)) {
        return null;
    }
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * Write a file through a sibling temporary file and rename.
 *
 * @param {string} filePath destination
 * @param {string|Buffer} content content
 */
export function atomicWriteFile(filePath, content) {
    mkdirSync(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, content);
    renameSync(temporaryPath, filePath);
}

/**
 * Capture original text files for a recovery journal.
 *
 * @param {string} appRoot application root
 * @param {string[]} relativePaths paths relative to the application
 * @returns {Record<string, {existed: boolean, content: string|null, preHash: string|null, postHash?: string|null}>}
 */
export function captureFiles(appRoot, relativePaths) {
    return Object.fromEntries(
        relativePaths.map((relativePath) => {
            const filePath = resolve(appRoot, relativePath);
            if (!isContainedPath(appRoot, filePath)) {
                throw new Error(`Recovery target escapes the application root: ${relativePath}`);
            }
            if (!existsSync(filePath)) {
                return [relativePath, { existed: false, content: null, preHash: null }];
            }
            assertSafeExistingFile(appRoot, filePath);
            return [
                relativePath,
                {
                    existed: true,
                    content: readFileSync(filePath, 'utf8'),
                    preHash: hashFile(filePath)
                }
            ];
        })
    );
}

/**
 * Add current hashes to journal file entries after successful setup.
 *
 * @param {string} appRoot application root
 * @param {Record<string, object>} files journal entries
 */
export function recordPostHashes(appRoot, files) {
    for (const [relativePath, state] of Object.entries(files)) {
        state.postHash = hashFile(resolve(appRoot, relativePath));
    }
}

/**
 * Verify no installer-owned file changed after setup.
 *
 * @param {string} appRoot application root
 * @param {Record<string, {postHash?: string|null}>} files journal entries
 */
export function assertPostHashes(appRoot, files) {
    for (const [relativePath, state] of Object.entries(files)) {
        if (state.postHash === undefined || hashFile(resolve(appRoot, relativePath)) !== state.postHash) {
            throw new Error(`${relativePath} changed after MockGen setup; refusing to overwrite the developer's edit`);
        }
    }
}

/**
 * Restore journaled files. All conflicts are checked before the first write.
 *
 * @param {string} appRoot application root
 * @param {Record<string, {existed: boolean, content: string|null, postHash?: string|null}>} files journal entries
 * @param {{checkPostHashes?: boolean}} [options] restoration options
 */
export function restoreFiles(appRoot, files, options = {}) {
    if (options.checkPostHashes !== false) {
        assertPostHashes(appRoot, files);
    }
    for (const [relativePath, state] of Object.entries(files)) {
        const filePath = resolve(appRoot, relativePath);
        if (!isContainedPath(appRoot, filePath)) {
            throw new Error(`Recovery target escapes the application root: ${relativePath}`);
        }
        if (state.existed) {
            atomicWriteFile(filePath, state.content ?? '');
        } else if (existsSync(filePath)) {
            assertSafeExistingFile(appRoot, filePath);
            unlinkSync(filePath);
        }
    }
}
