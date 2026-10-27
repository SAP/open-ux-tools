import { basename, join } from 'node:path';
import type { FioriElementsVersion } from '../project-spec-types.js';
import type { MemFsEditor } from 'mem-fs-editor';
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
    fs: MemFsEditor;
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
    const { fs, projectInfo, templateData, rootPath, keepIndex, internalToggle, ui5Version, FioriElementsVersionEnum } =
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
    } catch (error: unknown) {
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

    await applyTemplates(fs, templates, templateData, rootPath, undefined, ui5Version);
}
