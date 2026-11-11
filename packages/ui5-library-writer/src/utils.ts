import { gte } from 'semver';
import { join } from 'node:path';
import type { MemFsEditor as Editor } from 'mem-fs-editor';

export const ui5LtsVersion_1_71 = '1.71.0';
export const ui5LtsVersion_1_120 = '1.120.0';

/**
 * `globOptions` accepted by `copyTpl`, augmented with `ignore`. mem-fs-editor v12 narrows the
 * `globOptions` type and drops `ignore`, but tinyglobby still honours it at runtime.
 */
export type GlobOptionsWithIgnore = NonNullable<NonNullable<Parameters<Editor['copyTpl']>[3]>['globOptions']> & {
    ignore?: string | readonly string[];
};

/**
 * `copyTpl` options with a `globOptions` that accepts `ignore` (honoured at runtime, dropped from v12 types).
 */
export type CopyOptionsWithIgnore = Omit<NonNullable<Parameters<Editor['copyTpl']>[3]>, 'globOptions'> & {
    globOptions?: GlobOptionsWithIgnore;
};

/**
 * Applies a path rename to files already present in the mem-fs store.
 *
 * `copyTpl` in `mem-fs-editor@12` no longer accepts the `processDestinationPath` callback that
 * used to rename files during the copy, so the rename happens here once the templates are
 * rendered. Because `fs.move()` is implemented as a copy followed by a delete, every renamed
 * origin stays in the store as a `state: 'deleted'` entry and is therefore visible in `fs.dump()`.
 *
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @param {string} basePath - The base path the rename callback operates relative to.
 * @param {(relPath: string) => string} rename - Maps a `basePath`-relative path to its renamed path.
 * @returns {void}
 */
export function renameInStore(fs: Editor, basePath: string, rename: (relPath: string) => string): void {
    const livePaths = Object.entries(fs.dump(basePath))
        .filter(([, entry]) => entry.state !== 'deleted')
        .map(([path]) => path);
    for (const originalPath of livePaths) {
        const targetPath = rename(originalPath);
        if (targetPath === originalPath) {
            continue;
        }
        fs.move(join(basePath, originalPath), join(basePath, targetPath));
    }
}

/**
 * Compares two UI5 versions to determine if the first is greater than or equal to the second.
 *
 * @param {string} ui5VersionA - The first UI5 version to compare.
 * @param {string} ui5VersionB - The second UI5 version to compare.
 * @returns {boolean} - True if the first version is greater than or equal to the second, false otherwise.
 */
export function compareUI5VersionGte(ui5VersionA: string, ui5VersionB: string): boolean {
    if (ui5VersionA === '') {
        // latest version
        return true;
    } else {
        return gte(ui5VersionA, ui5VersionB, { loose: true });
    }
}

/**
 * Gets the template version path based on the UI5 version.
 *
 * @param version - The framework version.
 * @returns {string} - The template version path.
 */
export function getTemplateVersionPath(version: string): string {
    let templateVersionPath = '';
    if (compareUI5VersionGte(version, ui5LtsVersion_1_120)) {
        templateVersionPath = ui5LtsVersion_1_120;
    } else {
        templateVersionPath = ui5LtsVersion_1_71;
    }

    return templateVersionPath;
}
