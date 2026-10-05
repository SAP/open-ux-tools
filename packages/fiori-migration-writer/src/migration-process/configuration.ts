/**
 * Helper functions for preparing configuration data during migration
 */
import type { ImportProjectInfo } from '../types.js';
import { getUi5ThemeBasedOnUi5Version } from '../utils/index.js';
import { getSupportedThemes } from '../template/theme.js';
import { getComponentMapping } from '../components/component-mapping.js';
import { prepareProjectAndServiceData } from '../project/project-data.js';

/**
 * Configuration data prepared for migration
 */
export interface PreparedConfigurationData {
    supportedThemes: string[];
    ui5Theme: string;
    semanticObject: string;
    fullyQualifiedProjectName: string;
    fullyQualifiedProjectNameAMD: string;
    sapUiLibs: string;
    baseUiLibsStr: string;
    projectUI5Version: string;
    sapClientParam: string;
    projectData: any;
    serviceData: any;
}

/**
 * Prepare all configuration data needed for migration
 * Consolidates theme resolution, component mapping, and project/service data preparation
 *
 * @param projectInfo - Project information
 * @param ui5Version - UI5 version (can be undefined)
 * @param enableTypeScript - Whether TypeScript support should be enabled
 * @returns Prepared configuration data
 */
export async function prepareConfigurationData(
    projectInfo: ImportProjectInfo,
    ui5Version: string | undefined,
    enableTypeScript = false
): Promise<PreparedConfigurationData> {
    // Get supported themes for the project
    const supportedThemes = await getSupportedThemes(projectInfo, ui5Version || '');
    const ui5Theme = getUi5ThemeBasedOnUi5Version(ui5Version ?? '', projectInfo.ui5Theme);

    // Get component mapping based on floor plan
    const { appMigratorSrcComponentToReplace, semanticObject } = getComponentMapping(projectInfo);

    // Prepare project and service data structures
    const {
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD,
        sapUiLibs,
        baseUiLibsStr,
        projectUI5Version,
        sapClientParam,
        projectData,
        serviceData
    } = prepareProjectAndServiceData(
        projectInfo,
        semanticObject,
        appMigratorSrcComponentToReplace,
        ui5Theme,
        enableTypeScript
    );

    return {
        supportedThemes,
        ui5Theme,
        semanticObject,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD,
        sapUiLibs,
        baseUiLibsStr,
        projectUI5Version,
        sapClientParam,
        projectData,
        serviceData
    };
}
