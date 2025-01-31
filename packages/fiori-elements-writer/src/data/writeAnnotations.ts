import { sep } from 'path';
import { type CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import { getCapFolderPathsSync } from '@sap-ux/fiori-generator-shared';
import { TemplateType } from '../types';
import {
    generateAnnotations,
    type AnnotationServiceParameters,
    type GenerateAnnotationsOptions
} from '@sap-ux/annotation-generator';
import type { Editor } from 'mem-fs-editor';
import type { OdataVersion } from '@sap-ux/odata-service-writer';

/**
 * The list of template types that support generation of annotations.
 */
export const annotationSupportedTemplateTypes: TemplateType[] = [
    TemplateType.ListReportObjectPage,
    TemplateType.Worklist,
    TemplateType.FormEntryObjectPage
];

/**
 * Generates the annotation file path based on whether the CAP service is available.
 *
 * @param {string} [appName] - The name of the application.
 * @param {CapServiceCdsInfo} [capService] - The CAP service info.
 * @returns {string} The annotation file path based on whether the CAP service is available.
 */
function getAnnotationFilePath(appName?: string, capService?: CapServiceCdsInfo): string {
    if (capService) {
        const appPath = capService.appPath ?? getCapFolderPathsSync(capService.projectPath).app;
        return `${appPath}${sep}${appName}${sep}annotations.cds`;
    }
    return `webapp${sep}annotations${sep}annotation.xml`;
}

/**
 * Determines if annotations can be generated for a given template.
 *
 * @param {boolean} [addAnnotations] - An optional flag indicating whether annotations should be enabled.
 * @param {OdataVersion} odataServiceVersion - The version of the OData service being used.
 * @param {TemplateType} templateType - The type of the template being used by app.
 * @returns {boolean} - Returns `true` if annotations can be generated, otherwise `false`.
 */
export function canGenerateAnnotationsForTemplate(
    addAnnotations: boolean = false,
    odataServiceVersion: OdataVersion,
    templateType: TemplateType
): boolean {
    return addAnnotations && annotationSupportedTemplateTypes.includes(templateType) && odataServiceVersion === '4';
}

/**
 * Writes annotation files for the given application configuration.
 *
 * @param {string} basePath - The base directory path of the project.
 * @param {object} appInfo - Information about the application.
 * @param {Template} appInfo.templateType - The template type of the application.
 * @param {string} appInfo.packageName - The package name of the application.
 * @param {string} appInfo.entitySetName - The entity set name associated with the annotations.
 * @param {CapServiceCdsInfo} [appInfo.capService] - Optional CAP service information.
 * @param {Editor} fs - The file system editor instance.
 * @returns {Promise<void>} A promise that resolves when the annotation files are successfully generated.
 */
export async function writeAnnotations(
    basePath: string,
    appInfo: {
        templateType: TemplateType;
        packageName?: string;
        entitySetName: string;
        capService?: CapServiceCdsInfo;
    },
    fs: Editor
): Promise<void> {
    let serviceName = 'mainService';
    let projectPath = basePath;

    // Determine whether to add line items
    const addLineItems =
        appInfo.templateType === TemplateType.ListReportObjectPage || appInfo.templateType === TemplateType.Worklist;

    if (appInfo.capService) {
        serviceName = appInfo.capService.serviceName;
        projectPath = appInfo.capService.projectPath;
    }

    const options: GenerateAnnotationsOptions = {
        entitySetName: appInfo.entitySetName,
        annotationFilePath: getAnnotationFilePath(appInfo.packageName, appInfo.capService),
        addFacets: true,
        addLineItems,
        addValueHelps: !!appInfo.capService
    };

    const serviceParameters: AnnotationServiceParameters = {
        serviceName,
        appName: appInfo.packageName,
        project: projectPath
    };

    await generateAnnotations(fs, serviceParameters, options);
}
