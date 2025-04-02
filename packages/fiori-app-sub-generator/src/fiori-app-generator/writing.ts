import { generateReadMe, getHostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { ReadMe } from '@sap-ux/fiori-generator-shared';
import type { EntityRelatedAnswers } from '@sap-ux/odata-service-inquirer';
import type { Editor } from 'mem-fs-editor';
import { basename, join } from 'path';
import { DEFAULT_CAP_HOST } from '../types';
import type { ApiHubConfig, Floorplan, Project, Service } from '../types';
import { getReadMeDataSourceLabel, getLaunchText, isBTPHosted, t } from '../utils';

/**
 * Writes a README.md file based on project, service, and additional readme properties.
 *
 * @param project
 * @param service
 * @param floorplan
 * @param generatorName
 * @param generatorVersion
 * @param targetPath
 * @param fs
 * @param entityRelatedAnswers
 * @param readMe
 */
export async function writeReadMe(
    project: Project,
    service: Service,
    floorplan: Floorplan,
    generatorName: string,
    generatorVersion: string,
    targetPath: string,
    fs: Editor,
    entityRelatedAnswers?: EntityRelatedAnswers,
    readMe?: Partial<ReadMe> // todo: Is this needed anymore?
): Promise<void> {
    const templateLabel = t(`LABEL_FLOORPLAN_${floorplan}`, {
        odataVersion: service.version
    });

    const datasourceLabel = getReadMeDataSourceLabel(
        service.source,
        isBTPHosted(service.connectedSystem),
        service.apiHubConfig?.apiHubType
    );

    // Assign any custom overridding properties that may be provided via headless, adaptors or
    const readMeCustom: Partial<ReadMe> = Object.assign(
        {
            generatorName,
            generatorVersion,
            template: templateLabel,
            serviceType: datasourceLabel,
            serviceUrl:
                `${service.capService ? DEFAULT_CAP_HOST : service.host ?? ''}${service.servicePath ?? ''}` ||
                t('TEXT_NOT_APPLICABLE')
        } as Partial<ReadMe>,
        readMe
    );

    if (!readMeCustom.additionalEntries) {
        readMeCustom.additionalEntries = [];
    }

    if (entityRelatedAnswers?.mainEntity) {
        readMeCustom.additionalEntries.push({
            label: t('LABEL_MAIN_ENTITY'),
            value: entityRelatedAnswers.mainEntity.entitySetName
        });
    }
    if (entityRelatedAnswers?.navigationEntity) {
        readMeCustom.additionalEntries.push({
            label: t('LABEL_NAVIGATION_ENTITY'),
            value: entityRelatedAnswers.navigationEntity.navigationPropertyName || 'None'
        });
    }
    if (entityRelatedAnswers?.filterEntityType) {
        readMeCustom.additionalEntries.push({
            label: t('LABEL_README_FILTER_ENTITY_TYPE'),
            value: entityRelatedAnswers.filterEntityType.entitySetName
        });
    }

    const launchText = await getLaunchText(
        service.capService,
        project.name,
        !!project.enableTypeScript,
        project.namespace
    );

    const readme: ReadMe = {
        generationDate: readMeCustom?.generationDate || new Date().toString(),
        generatorPlatform: readMeCustom?.generatorPlatform || getHostEnvironment().name,
        serviceType: readMeCustom?.serviceType,
        metadataFilename: service.localEdmxFilePath ? basename(service.localEdmxFilePath) : '',
        serviceUrl: readMeCustom?.serviceUrl,
        appName: project.name,
        appTitle: project.title,
        appDescription: project.description,
        appNamespace: project.namespace ?? '',
        ui5Theme: project.ui5Theme,
        ui5Version: readMeCustom?.ui5Version || project.manifestMinUI5Version || project.ui5Version,
        enableCodeAssist: project.enableCodeAssist,
        enableEslint: project.enableEslint,
        enableTypeScript: project.enableTypeScript,
        showMockDataInfo: !!service.edmx && !service.capService,
        generatorVersion: readMeCustom?.generatorVersion || '',
        template: readMeCustom?.template || '',
        generatorName: readMeCustom?.generatorName || '',
        additionalEntries: readMeCustom?.additionalEntries || [],
        launchText
    };
    generateReadMe(targetPath, readme, fs);
}

/**
 * Create the files for apiHub integration.
 *
 * @param fs
 * @param destPath
 * @param apiHubConfig
 */
export function writeAPIHubKeyFiles(fs: Editor, destPath: string, apiHubConfig: ApiHubConfig): void {
    const envFilePath = join(destPath, '.env');
    const envContent = `API_HUB_API_KEY=${apiHubConfig.apiHubKey}\nAPI_HUB_TYPE=${apiHubConfig.apiHubType}`;
    // Create .env to store apiHub integration.
    fs.write(envFilePath, envContent);
}
