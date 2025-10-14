import { gte } from 'semver';
import { type UI5, type TemplateOptions } from './types';
import { join } from 'node:path';
import { FileName } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';

export const ui5LtsVersion_1_71 = '1.71.0';
export const ui5LtsVersion_1_120 = '1.120.0';

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
    fs.copyTpl(join(tmplPath, 'core', templateUi5Version, '**/*.*'), join(basePath), templateOptions, undefined, {
        globOptions: { dot: true, ignore }
    });

    // Copy remaining common files
    fs.copyTpl(
        remainingCoreFiles.map((fileName) => join(tmplPath, 'core', fileName)),
        join(basePath),
        templateOptions,
        undefined,
        {
            globOptions: { dot: true, ignore },
            processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
        }
    );
}
