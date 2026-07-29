import { join } from 'node:path';
import {
    getSapTemplatesMap,
    getFeTemplatesMap,
    getFLPSandboxTemplatesMap,
    getFLPSandboxMockServerTemplatesMap,
    getCommonV4TemplatesMap,
    fileExists
} from '../utils/index.js';
import type { FioriElementsVersion } from '../project-spec-types.js';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import type { ImportProjectInfo, TemplateData } from '../types.js';
import { TemplateDataKey } from '../types.js';
import type { MigrationTypes } from '../utils/constants.js';
import { applyTemplates } from './template-helpers.js';

/**
 * Configuration for applying application templates
 */
export interface ApplyApplicationTemplatesConfig {
    projectInfo: ImportProjectInfo;
    templateData: TemplateData;
    rootPath: string;
    appIntent: string;
    appMockIntent: string | undefined;
    hasDataSource: boolean;
    isSAPApp: boolean;
    ui5Version: string | undefined;
    MigrationTypesEnum: typeof MigrationTypes;
    FioriElementsVersionEnum: typeof FioriElementsVersion;
}

/**
 * Applies application-specific templates based on project type and FE version
 *
 * @param config - Configuration object containing all required parameters
 */
export async function applyApplicationTemplates(config: ApplyApplicationTemplatesConfig): Promise<void> {
    const {
        projectInfo,
        templateData,
        rootPath,
        appIntent,
        appMockIntent,
        hasDataSource,
        isSAPApp,
        ui5Version,
        MigrationTypesEnum: migrationTypesEnum,
        FioriElementsVersionEnum: fioriElementsVersionEnum
    } = config;
    // Step4b. Apply specific application templates
    if (isSAPApp || projectInfo.FEVersion === fioriElementsVersionEnum.v2) {
        await applyV2OrSapAppTemplates(projectInfo, templateData, rootPath, {
            appIntent,
            appMockIntent,
            hasDataSource,
            isSAPApp,
            ui5Version,
            migrationTypesEnum
        });
    } else if (projectInfo.FEVersion === fioriElementsVersionEnum.v4) {
        await applyV4Templates(projectInfo, templateData, rootPath, appIntent, ui5Version);
    }
}

/**
 * Configuration for V2/SAP app template application
 */
interface V2AppTemplateConfig {
    appIntent: string;
    appMockIntent: string | undefined;
    hasDataSource: boolean;
    isSAPApp: boolean;
    ui5Version: string | undefined;
    migrationTypesEnum: typeof MigrationTypes;
}

/**
 * Applies templates for V2 Fiori Elements or SAP apps
 *
 * @param projectInfo
 * @param templateData
 * @param rootPath
 * @param config
 */
async function applyV2OrSapAppTemplates(
    projectInfo: ImportProjectInfo,
    templateData: TemplateData,
    rootPath: string,
    config: V2AppTemplateConfig
): Promise<void> {
    const { appIntent, appMockIntent, hasDataSource, isSAPApp, ui5Version, migrationTypesEnum } = config;
    const appTemplates = isSAPApp ? getSapTemplatesMap() : getFeTemplatesMap(projectInfo.webappPath);

    // Only update component.js in case app has namespace and is v2

    if (projectInfo.FEVersion === 'v2' && projectInfo.namespace) {
        appTemplates[TemplateFileName.Component] = {
            path: join(DirName.Webapp),
            targetPath: join(projectInfo.webappPath),
            templateDataKey: TemplateDataKey.project
        };
    }

    // Create template data for FLP sandbox with app intent
    const templateDataFlp = { ...templateData };
    templateDataFlp.project = { ...templateData.project };
    templateDataFlp.project.semanticObject = appIntent.replace('#', '');
    templateDataFlp.project.flpAppId = appIntent.replace('#', '');

    // Create template data for FLP sandbox with mock intent
    const templateDataFlpMock = { ...templateData };
    templateDataFlpMock.project = { ...templateData.project };
    templateDataFlpMock.project.semanticObject = appMockIntent?.replace('#', '');
    templateDataFlpMock.project.flpAppId = appMockIntent?.replace('#', '');

    // Apply FLP sandbox templates (unless extension project)
    if (projectInfo.type !== migrationTypesEnum.projectExtension) {
        await applyTemplates(
            { ...getFLPSandboxTemplatesMap(projectInfo.webappPath), ...appTemplates },
            templateDataFlp,
            rootPath,
            isSAPApp ? TemplateFileName.SAPApp : TemplateFileName.AppSettings,
            ui5Version
        );
    }

    // Apply mock server templates if data source exists
    let mockServerFiles;
    if (hasDataSource) {
        mockServerFiles = getFLPSandboxMockServerTemplatesMap(projectInfo.webappPath);
        const mockServerFileName = templateData.mockServerJSFileName || 'mockserver';
        const mockServerJsPath = join(
            projectInfo.rootPath,
            projectInfo.webappPath,
            DirName.LocalService,
            mockServerFileName.endsWith('.js') ? mockServerFileName : `${mockServerFileName}.js`
        );

        // Create mockserver.js if it doesn't exist
        if (!(await fileExists(mockServerJsPath))) {
            mockServerFiles[TemplateFileName.MockServer] = {
                path: join(DirName.Webapp, DirName.LocalService),
                targetPath: join(projectInfo.webappPath, DirName.LocalService),
                templateDataKey: TemplateDataKey.project
            };
        }
    }

    await applyTemplates(
        { ...mockServerFiles, ...appTemplates },
        templateDataFlpMock,
        rootPath,
        isSAPApp ? TemplateFileName.SAPApp : TemplateFileName.AppSettings,
        ui5Version
    );
}

/**
 * Applies templates for V4 Fiori Elements apps
 *
 * @param projectInfo
 * @param templateData
 * @param rootPath
 * @param appIntent
 * @param ui5Version
 */
async function applyV4Templates(
    projectInfo: ImportProjectInfo,
    templateData: TemplateData,
    rootPath: string,
    appIntent: string,
    ui5Version: string | undefined
): Promise<void> {
    const templateDataFlp = { ...templateData };
    templateDataFlp.project = { ...templateData.project };
    templateDataFlp.project.semanticObject = appIntent.replace('#', '');
    templateDataFlp.project.flpAppId = appIntent.replace('#', '');

    await applyTemplates(
        { ...getCommonV4TemplatesMap(projectInfo.webappPath) },
        templateDataFlp,
        rootPath,
        TemplateFileName.AppSettingsV4,
        ui5Version
    );
}
