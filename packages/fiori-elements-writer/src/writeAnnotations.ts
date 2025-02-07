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
 * Writes annotation files for the given application configuration.
 *
 * @param basePath - The base directory path of the project.
 * @param feApp -  to generate the Fiori elements application
 * @param fs - The file system editor instance.
 * @param log - The logger instance.
 */
export async function writeAnnotations<T extends {}>(
    basePath: string,
    feApp: FioriElementsApp<T>,
    fs: Editor,
    log?: Logger
): Promise<void> {
    if (TemplateTypeAttributes[feApp.template.type]?.annotationGenerationSupport?.[feApp.service.version]) {
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
        try {
            await generateAnnotations(fs, serviceParameters, options);
        } catch (err) {
            log?.error(`${t('error.errorGeneratingDefaultAnnotations')} ${err}`);
        }
    } else {
        log?.warn(
            t('warn.invalidTypeForAnnotationGeneration', {
                templateType: feApp.template.type,
                odataVersion: feApp.service.version
            })
        );
    }
}
