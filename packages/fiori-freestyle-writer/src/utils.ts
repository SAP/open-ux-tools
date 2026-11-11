import type { FreestyleApp } from './types.js';
import { TemplateType } from './types.js';
import { gte } from 'semver';
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
 * `copyTpl` options with the `globOptions.ignore` gap re-added (see {@link GlobOptionsWithIgnore}).
 */
export type CopyOptionsWithIgnore = Omit<NonNullable<Parameters<Editor['copyTpl']>[3]>, 'globOptions'> & {
    globOptions?: GlobOptionsWithIgnore;
};

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
 * Gets the template version path based on the UI5 version and template type.
 *
 * @param {FreestyleApp<unknown>} ffApp - The freestyle app configuration.
 * @returns {string} - The template version path.
 */
export function getTemplateVersionPath(ffApp: FreestyleApp<unknown>): string {
    let templateVersionPath = '';
    const ui5Version = ffApp.ui5?.minUI5Version ?? ffApp.ui5?.version ?? '';
    if (ffApp.template.type === TemplateType.Basic) {
        if (compareUI5VersionGte(ui5Version, ui5LtsVersion_1_120)) {
            templateVersionPath = ui5LtsVersion_1_120;
        } else {
            templateVersionPath = ui5LtsVersion_1_71;
        }
    }

    return templateVersionPath;
}

/**
 * Processes the destination path by removing specific version segments.
 *
 * Operates on POSIX (forward-slash) mem-fs store keys, so the separator is hardcoded to `/`.
 *
 * @param {string} filePath - The file path to process.
 * @returns {string} - The processed file path.
 */
export function processDestinationPath(filePath: string): string {
    return filePath.replace(/(^|\/)1\.120\.0\//, '$1').replace(/(^|\/)1\.71\.0\//, '$1');
}
