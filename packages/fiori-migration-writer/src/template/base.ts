import { basename, join } from 'node:path';
import fs from 'node:fs';
import type { FioriElementsVersion } from '../project-spec-types.js';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import { trueCasePath } from 'true-case-path';
import { getBaseTemplatesMap, isGenerateIndex } from '../utils/index.js';
import type { ImportProjectInfo, TemplateData, TemplateMap } from '../types.js';
import { applyTemplates } from './template-helpers.js';

/**
 * Configuration for applying base templates
 */
export interface ApplyBaseTemplatesConfig {
    projectInfo: ImportProjectInfo;
    templateData: TemplateData;
    rootPath: string;
    keepIndex: boolean;
    internalToggle: boolean;
    ui5Version: string | undefined;
    FioriElementsVersionEnum: typeof FioriElementsVersion;
}

/**
 * Applies base application templates (index.html, etc.)
 * Handles mock server filename determination and local service path fixing
 *
 * @param config - Configuration object containing all required parameters
 */
export async function applyBaseTemplates(config: ApplyBaseTemplatesConfig): Promise<void> {
    const { projectInfo, templateData, rootPath, keepIndex, internalToggle, ui5Version, FioriElementsVersionEnum } =
        config;
    // Step3. Apply base application templates

    // Determine mock server filename (handle case sensitivity)
    const mockServerJsPath = join(
        projectInfo.rootPath,
        projectInfo.webappPath,
        DirName.LocalService,
        TemplateFileName.MockServer
    );
    templateData.mockServerJSFileName = basename(TemplateFileName.MockServer, '.js');
    try {
        const mockServerJsRealPath = await trueCasePath(mockServerJsPath);
        templateData.mockServerJSFileName = basename(mockServerJsRealPath, '.js');
    } catch {
        // do nothing - use default
    }

    // Get and apply base templates (index.html, etc.)
    const templates: TemplateMap = getBaseTemplatesMap(
        projectInfo.webappPath,
        projectInfo.FEVersion,
        projectInfo.type,
        isGenerateIndex(projectInfo, internalToggle)
    );

    // If keeping existing index, rename generated one to index_new.html
    if (keepIndex) {
        templates[
            projectInfo.FEVersion === FioriElementsVersionEnum.v4
                ? TemplateFileName.V4IndexHtml
                : TemplateFileName.V2IndexHtml
        ].targetName = 'index_new.html';
    }

    await applyTemplates(templates, templateData, rootPath, undefined, ui5Version);

    // Step4a. Fix local service case (handle case-sensitive filesystems)
    await fixLocalServiceCase(projectInfo);
}

/**
 * Fixes local service directory case on case-sensitive filesystems
 * Renames directory if case doesn't match expected case
 *
 * @param projectInfo - Project information
 */
async function fixLocalServiceCase(projectInfo: ImportProjectInfo): Promise<void> {
    const localServicePath = join(projectInfo.rootPath, projectInfo.webappPath, DirName.LocalService);
    try {
        const localServiceRealPath = await trueCasePath(localServicePath);
        // file exists. Check filename cases matches
        if (basename(localServiceRealPath) !== basename(localServicePath)) {
            fs.renameSync(localServiceRealPath, localServicePath);
        }
    } catch {
        // do nothing - path doesn't exist or other error
    }
}
