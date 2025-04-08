import type { ReadMe } from '@sap-ux/fiori-generator-shared';
import { generateReadMe, getHostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { Editor } from 'mem-fs-editor';
import { basename, join } from 'path';
import type { ApiHubConfig, State } from '../types';
import { DEFAULT_CAP_HOST } from '../types';
import { getLaunchText, getReadMeDataSourceLabel, isBTPHosted, t } from '../utils';

/**
 * Writes a README.md file based on project, service, and additional readme properties.
 *
 * @param state
 * @param state.project
 * @param state.service
 * @param state.floorplan
 * @param state.entityRelatedConfig
 * @param generatorName
 * @param generatorVersion
 * @param targetPath
 * @param fs
 * @param readMe
 */
export async function writeReadMe(
    { project, service, floorplan, entityRelatedConfig }: State,
    generatorName: string,
    generatorVersion: string,
    targetPath: string,
    fs: Editor,
    readMe?: Partial<ReadMe>
): Promise<void> {
    const templateLabel = t(`floorplans.label.${floorplan}`, {
        odataVersion: service.version
    });

    const datasourceLabel = getReadMeDataSourceLabel(
        service.source,
        isBTPHosted(service.connectedSystem),
        service.apiHubConfig?.apiHubType
    );

    // Assign any custom overriding properties that may be provided via headless, adaptors
    const readMeCustom: Partial<ReadMe> = Object.assign(
        {
            generatorName,
            generatorVersion,
            template: templateLabel,
            serviceType: datasourceLabel,
            serviceUrl:
                `${service.capService ? DEFAULT_CAP_HOST : service.host ?? ''}${service.servicePath ?? ''}` ||
                t('texts.notApplicable')
        } as Partial<ReadMe>,
        readMe
    );

    if (!readMeCustom.additionalEntries) {
        readMeCustom.additionalEntries = [];
    }

    if (entityRelatedConfig?.mainEntity) {
        readMeCustom.additionalEntries.push({
            label: t('readme.label.mainEntity'),
            value: entityRelatedConfig.mainEntity.entitySetName
        });
    }
    if (entityRelatedConfig?.navigationEntity) {
        readMeCustom.additionalEntries.push({
            label: t('readme.label.navigationEntity'),
            value: entityRelatedConfig.navigationEntity.navigationPropertyName || 'None'
        });
    }
    if (entityRelatedConfig?.filterEntityType) {
        readMeCustom.additionalEntries.push({
            label: t('readme.label.filterEntityType'),
            value: entityRelatedConfig.filterEntityType.entitySetName
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
