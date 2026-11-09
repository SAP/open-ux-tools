import { gte, coerce } from 'semver';
import { type UI5, type TemplateOptions } from './types.js';
import { join, relative, resolve, sep } from 'node:path';
import { render } from 'ejs';
import { FileName } from '@sap-ux/project-access';
import type { MemFsEditor as Editor } from 'mem-fs-editor';

export const ui5LtsVersion_1_71 = '1.71.0';
export const ui5LtsVersion_1_120 = '1.120.0';

/**
 * `mem-fs-editor@12` narrows `globOptions` to a subset of `tinyglobby`'s options that omits
 * `ignore`, even though `ignore` is still honoured at runtime. Re-add it for the call sites
 * that rely on it.
 */
export type GlobOptionsWithIgnore = NonNullable<NonNullable<Parameters<Editor['copyTpl']>[3]>['globOptions']> & {
    ignore?: string | readonly string[];
};

/**
 * `copy`'s options with the `globOptions.ignore` gap re-added (see {@link GlobOptionsWithIgnore}).
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
 * @param fs - the mem-fs editor instance
 * @param from - source path(s) / glob(s) to copy
 * @param to - destination base path
 * @param data - EJS template data (as `copyTpl`'s 3rd argument)
 * @param rename - maps a POSIX, `to`-relative destination path to its renamed path
 * @param copyOptions - optional copy options (e.g. `globOptions`)
 */
export function copyTplAndRename(
    fs: Editor,
    from: string | string[],
    to: string,
    data: object,
    rename: (posixRelPath: string) => string,
    copyOptions?: CopyOptionsWithIgnore
): void {
    const resolvedTo = resolve(to);
    fs.copy(from, to, {
        ...copyOptions,
        transformData: data,
        fileTransform({ destinationPath, sourcePath, contents }) {
            const renderedPath = render(destinationPath, data, {});
            // No binary template files exist in this package; text is always safe to render.
            const processedContents = render(contents.toString(), data, { filename: sourcePath });
            const strippedPath = renderedPath.endsWith('.ejs') ? renderedPath.replace(/\.ejs$/, '') : renderedPath;
            const relPosix = relative(resolvedTo, strippedPath).split(sep).join('/');
            return { path: join(resolvedTo, rename(relPosix)), contents: processedContents };
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
        const coercedUi5VersionA = coerce(ui5VersionA, { loose: true });
        const coercedUi5VersionB = coerce(ui5VersionB, { loose: true });

        if (!coercedUi5VersionA || !coercedUi5VersionB) {
            return false;
        }

        return gte(coercedUi5VersionA, coercedUi5VersionB, { loose: true });
    }
}

/**
 * Gets the template version path based on the UI5 version and template type.
 *
 * @param {UI5} ui5 - The UI5 configuration.
 * @returns {string} - The template version path.
 */
export function getTemplateVersionPath(ui5: UI5): string {
    let templateVersionPath = '';
    const ui5Version = ui5?.minUI5Version ?? ui5?.version ?? '';
    if (ui5Version && compareUI5VersionGte(ui5Version, ui5LtsVersion_1_120)) {
        templateVersionPath = ui5LtsVersion_1_120;
    } else {
        templateVersionPath = ui5LtsVersion_1_71;
    }

    return templateVersionPath;
}

/**
 * Processes the destination path by removing specific version segments.
 *
 * @param {string} filePath - The file path to process.
 * @returns {string} - The processed file path.
 */
export function processDestinationPath(filePath: string): string {
    return filePath.replace('/1.120.0', '').replace('/1.71.0', '');
}

/**
 * Copies UI5 project template files and common files to the target base path.
 *
 * @param options - Options for copying template files
 * @param options.fs - The mem-fs editor instance
 * @param options.basePath - The target base path
 * @param options.tmplPath - The template root path
 * @param options.templateOptions - Template variables for file rendering
 * @param options.ignore - Glob patterns to ignore during copy
 * @param options.ui5Version - Optional UI5 version to determine template version
 */
export function copyTemplates(options: {
    fs: Editor;
    basePath: string;
    tmplPath: string;
    templateOptions: TemplateOptions;
    ignore: string[];
    ui5Version?: string;
}): void {
    const { fs, basePath, tmplPath, templateOptions, ignore, ui5Version } = options;

    const remainingCoreFiles = ['gitignore.tmpl', FileName.Package, FileName.Ui5LocalYaml, FileName.Ui5Yaml];

    const resolvedUi5Version = ui5Version ?? ui5LtsVersion_1_120;
    const templateUi5Version = compareUI5VersionGte(resolvedUi5Version, ui5LtsVersion_1_120)
        ? ui5LtsVersion_1_120
        : ui5LtsVersion_1_71;

    // Copy version-specific template files
    const copyOptions: CopyOptionsWithIgnore = { globOptions: { dot: true, ignore } };
    const toGitignore = (filePath: string): string => filePath.replace(/gitignore.tmpl/g, '.gitignore');
    copyTplAndRename(
        fs,
        join(tmplPath, 'core', templateUi5Version, '**/*.*'),
        join(basePath),
        templateOptions,
        toGitignore,
        copyOptions
    );

    // Copy remaining common files. mem-fs-editor@12 does not apply `globOptions.ignore` when the
    // copy source is an explicit file list (only when it is a glob), so filter the list up-front.
    const coreFilesToCopy = remainingCoreFiles.filter(
        (fileName) => !ignore.some((pattern) => pattern.replace(/^\*\*\//, '') === fileName)
    );
    if (coreFilesToCopy.length > 0) {
        copyTplAndRename(
            fs,
            coreFilesToCopy.map((fileName) => join(tmplPath, 'core', fileName)),
            join(basePath),
            templateOptions,
            toGitignore,
            copyOptions
        );
    }
}
