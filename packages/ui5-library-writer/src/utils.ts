import { gte } from 'semver';
import { join, relative, sep } from 'node:path';
import { render } from 'ejs';
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
 * `copy` options with a `globOptions` that accepts `ignore` (honoured at runtime, dropped from v12 types).
 */
export type CopyOptionsWithIgnore = Omit<NonNullable<Parameters<Editor['copy']>[2]>, 'globOptions'> & {
    globOptions?: GlobOptionsWithIgnore;
};

/**
 * Copies template files while renaming them during the copy, mirroring what `copyTpl` does internally.
 *
 * `mem-fs-editor@12` removed `copyTpl`'s `processDestinationPath` rename callback. Doing the rename
 * as a post-copy `fs.move()` would leave `state: 'deleted'` tombstones in the store (move = copy +
 * delete), which surface in `fs.dump()` snapshots. Instead this renders and renames in a single
 * `fs.copy()` pass via its `fileTransform` hook, so no tombstone is created. The rename callback
 * operates on the POSIX (forward-slash) destination path relative to `to`.
 *
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @param {string | string[]} from - Source path(s) / glob(s) to copy.
 * @param {string} to - Destination base path.
 * @param {object} data - EJS template data (as `copyTpl`'s 3rd argument).
 * @param {(posixRelPath: string) => string} rename - Maps a POSIX, `to`-relative destination path to its renamed path.
 * @param {CopyOptionsWithIgnore} [copyOptions] - Optional copy options (e.g. `globOptions`).
 * @returns {void}
 */
export function copyTplAndRename(
    fs: Editor,
    from: string | string[],
    to: string,
    data: object,
    rename: (posixRelPath: string) => string,
    copyOptions?: CopyOptionsWithIgnore
): void {
    fs.copy(from, to, {
        ...copyOptions,
        transformData: data,
        fileTransform({ destinationPath, sourcePath, contents }) {
            const renderedPath = render(destinationPath, data, {});
            // No binary template files exist in this package; text is always safe to render.
            const processedContents = render(contents.toString(), data, { filename: sourcePath });
            const strippedPath = renderedPath.endsWith('.ejs') ? renderedPath.replace(/\.ejs$/, '') : renderedPath;
            const relPosix = relative(to, strippedPath).split(sep).join('/');
            return { path: join(to, rename(relPosix)), contents: processedContents };
        }
    });
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
