import { join } from 'node:path';
import { DirName, FileName, FioriElementsVersion } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import type { TemplateMap } from '../types.js';
import { FLOOR_PLAN, TemplateDataKey } from '../types.js';
import { MigrationTypes } from './constants.js';

export const packageJsonTmplName = `${FileName.Package}.tmpl`;

export const propertyEditorTaskProjectTypes = [
    FLOOR_PLAN.ListReportObjectPageV2,
    FLOOR_PLAN.AnalyticalListPageV2,
    FLOOR_PLAN.OverviewPageV2,
    FLOOR_PLAN.WorklistV2
];

/**
 * Base templates for all projects
 *
 * @param webappDirPath
 * @param feVersion
 * @param projectType
 * @param generateIndex
 */
export const getBaseTemplatesMap = (
    webappDirPath: string = DirName.Webapp,
    feVersion: FioriElementsVersion | undefined = undefined,
    projectType?: MigrationTypes,
    generateIndex = true
): TemplateMap => {
    const result: TemplateMap = {
        [TemplateFileName.GitIgnoreTmpl]: {
            isRendered: false,
            path: join('static'),
            targetName: TemplateFileName.GitIgnore
        },
        [packageJsonTmplName]: {
            opts: { strict: false },
            path: '',
            targetName: FileName.Package,
            templateDataKey: TemplateDataKey.packageJson
        }
    };
    if (projectType !== MigrationTypes.projectExtension) {
        if (generateIndex) {
            if (feVersion === FioriElementsVersion.v4) {
                result[TemplateFileName.V4IndexHtml] = {
                    path: join(DirName.Webapp),
                    targetPath: join(webappDirPath),
                    targetName: TemplateFileName.IndexHtml
                };
            } else {
                result[TemplateFileName.V2IndexHtml] = {
                    path: join(DirName.Webapp),
                    targetPath: join(webappDirPath),
                    targetName: TemplateFileName.IndexHtml
                };
            }
        }
        result[TemplateFileName.LocateReuseLibs] = {
            isRendered: false,
            path: join(DirName.Webapp, TemplateFileName.Test),
            targetPath: join(webappDirPath, TemplateFileName.Test)
        };
    }
    return result;
};

/**
 * FLPSandbox templates shared across the different application types
 *
 * @param webappDirPath
 */
export const getFLPSandboxTemplatesMap = (webappDirPath: string = DirName.Webapp): TemplateMap => {
    return {
        [TemplateFileName.FLPSandbox]: {
            path: join(DirName.Webapp, TemplateFileName.Test),
            targetPath: join(webappDirPath, TemplateFileName.Test)
        }
    };
};

export const getFLPSandboxMockServerTemplatesMap = (webappDirPath: string = DirName.Webapp): TemplateMap => {
    return {
        [TemplateFileName.FLPSandboxMockServer]: {
            path: join(DirName.Webapp, TemplateFileName.Test),
            targetPath: join(webappDirPath, TemplateFileName.Test)
        }
    };
};

/**
 * Common templates shared across the different application types
 *
 * @param webappDirPath
 */
export const getCommonV4TemplatesMap = (webappDirPath: string = DirName.Webapp): TemplateMap => {
    return getFLPSandboxTemplatesMap(webappDirPath);
};

export const getSapTemplatesMap = (): TemplateMap => {
    return {};
};

export const getFeTemplatesMap = (webappDirPath: string = DirName.Webapp): TemplateMap => {
    return {
        [TemplateFileName.ChangesPreview]: {
            path: join(DirName.Webapp, TemplateFileName.Test),
            targetPath: join(webappDirPath, TemplateFileName.Test),
            templateDataKey: TemplateDataKey.project
        },
        [TemplateFileName.ChangesLoader]: {
            path: join(DirName.Webapp, TemplateFileName.Test),
            targetPath: join(webappDirPath, TemplateFileName.Test),
            templateDataKey: TemplateDataKey.project
        }
    };
};

export const getAdaptationTemplatesMap = (): TemplateMap => {
    return {
        [packageJsonTmplName]: {
            opts: { strict: false },
            path: '',
            targetName: FileName.Package,
            templateDataKey: TemplateDataKey.packageJson
        },
        [TemplateFileName.XSAppTmpl]: {
            path: '',
            targetName: 'xs-app.json',
            templateDataKey: TemplateDataKey.service
        }
    };
};

export const getLibraryTemplatesMap = (): TemplateMap => {
    return {
        [TemplateFileName.GitIgnoreTmpl]: {
            isRendered: false,
            path: '',
            targetName: TemplateFileName.GitIgnore
        },
        [packageJsonTmplName]: {
            opts: { strict: false },
            path: '',
            targetName: FileName.Package,
            templateDataKey: TemplateDataKey.packageJson
        }
    };
};

export const getFFTestSuiteMap = (webappDirPath: string = DirName.Webapp): TemplateMap => {
    return {
        [TemplateFileName.ModulePathForTests]: {
            path: join(webappDirPath, TemplateFileName.Test),
            targetPath: join(webappDirPath, TemplateFileName.Test, TemplateFileName.Testsuite)
        }
    };
};
