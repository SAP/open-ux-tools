import { sep } from 'path';
import { type CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import { getCapFolderPathsSync } from '@sap-ux/fiori-generator-shared';
import { TemplateType, type EntityConfig, type FioriElementsApp } from './types';
import {
    generateAnnotations,
    type AnnotationServiceParameters,
    type GenerateAnnotationsOptions
} from '@sap-ux/annotation-generator';
import type { Editor } from 'mem-fs-editor';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { TemplateTypeAttributes } from './data/templateAttributes';
import type { Logger } from '@sap-ux/logger';
import { t } from './i18n';

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
 * @param {OdataVersion} odataServiceVersion - The version of the OData service being used.
 * @param {TemplateType} templateType - The type of the template being used by app.
 * @param {boolean} [addAnnotations] - An optional flag indicating whether annotations should be enabled.
 * @returns {boolean} - Returns `true` if annotations can be generated, otherwise `false`.
 */
export function canGenerateAnnotationsForTemplate(
    odataServiceVersion: OdataVersion,
    templateType: TemplateType,
    addAnnotations: boolean = false
): boolean | undefined {
    return addAnnotations && TemplateTypeAttributes[templateType].supportsAnnotations(odataServiceVersion);
}

/**
 * Writes annotation files for the given application configuration.
 *
 * @param basePath - The base directory path of the project.
 * @param feApp -  to generate the Fiori elements application
 * @param fs - The file system editor instance.
 * @param log - Logger instance.
 */
export async function writeAnnotations<T extends {}>(
    basePath: string,
    feApp: FioriElementsApp<T>,
    fs: Editor,
    log?: Logger
): Promise<void> {
    // Check if annotations should be generated
    if (
        canGenerateAnnotationsForTemplate(feApp.service.version, feApp.template.type, feApp.appOptions?.addAnnotations)
    ) {
        const { settings } = feApp.template;
        const { capService } = feApp.service;
        const { name: packageName } = feApp.package ?? {};
        const entitySetName = (settings as T & { entityConfig?: EntityConfig })?.entityConfig?.mainEntityName ?? '';

        const addLineItems =
            feApp.template.type === TemplateType.ListReportObjectPage || feApp.template.type === TemplateType.Worklist;

        let serviceName = 'mainService';
        let projectPath = basePath;

        if (capService) {
            serviceName = capService.serviceName;
            projectPath = capService.projectPath;
        }

        const options: GenerateAnnotationsOptions = {
            entitySetName: entitySetName,
            annotationFilePath: getAnnotationFilePath(packageName, capService),
            addFacets: true,
            addLineItems,
            addValueHelps: !!capService
        };

        const serviceParameters: AnnotationServiceParameters = {
            serviceName,
            appName: packageName,
            project: projectPath
        };

        await generateAnnotations(fs, serviceParameters, options);
    } else {
        log?.warn(
            t('warn.invalidTypeForAnnotationGeneration', {
                templateType: feApp.template.type,
                odataVersion: feApp.service.version
            })
        );
    }
}
