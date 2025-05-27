import type { AppGenInfo } from '@sap-ux/fiori-generator-shared';
import { generateAppGenInfo, getHostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { Editor } from 'mem-fs-editor';
import { basename, join } from 'path';
import type { ApiHubConfig, State } from '../types';
import { DEFAULT_CAP_HOST } from '../types';
import { getLaunchText, getReadMeDataSourceLabel, isBTPHosted, t } from '../utils';

/**
 * Writes app related information files - README.md & .appGenInfo.json.
 * The files are based on the project, service, and additional properties.
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
 * @param existingAppGenInfo
 */
export async function writeAppGenInfoFiles(
    { project, service, floorplan, entityRelatedConfig }: State,
    generatorName: string,
    generatorVersion: string,
    targetPath: string,
    fs: Editor,
    existingAppGenInfo?: Partial<AppGenInfo>
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
    const appGenInfoCustom: Partial<AppGenInfo> = Object.assign(
        {
            generatorName,
            generatorVersion,
            template: templateLabel,
            serviceType: datasourceLabel,
            serviceUrl:
                `${service.capService ? DEFAULT_CAP_HOST : service.host ?? ''}${service.servicePath ?? ''}` ||
                t('texts.notApplicable')
        } as Partial<AppGenInfo>,
        existingAppGenInfo
    );

    appGenInfoCustom.entityRelatedConfig ??= [];

    if (entityRelatedConfig?.mainEntity) {
        appGenInfoCustom.entityRelatedConfig.push({
            type: t('readme.label.mainEntity'),
            value: entityRelatedConfig.mainEntity.entitySetName
        });
    }
    if (entityRelatedConfig?.navigationEntity) {
        appGenInfoCustom.entityRelatedConfig.push({
            type: t('readme.label.navigationEntity'),
            value: entityRelatedConfig.navigationEntity.navigationPropertyName || 'None'
        });
    }
    if (entityRelatedConfig?.filterEntitySet) {
        appGenInfoCustom.entityRelatedConfig.push({
            type: t('readme.label.filterEntityType'),
            value: entityRelatedConfig.filterEntitySet.entitySetName
        });
    }

    const launchText = await getLaunchText(
        service.capService,
        project.name,
        !!project.enableTypeScript,
        project.namespace
    );

    const appGenInfo: AppGenInfo = {
        generationDate: appGenInfoCustom?.generationDate ?? new Date().toString(),
        generatorPlatform: appGenInfoCustom?.generatorPlatform ?? getHostEnvironment().name,
        serviceType: appGenInfoCustom?.serviceType,
        metadataFilename: service.localEdmxFilePath ? basename(service.localEdmxFilePath) : '',
        serviceUrl: appGenInfoCustom?.serviceUrl,
        appName: project.name,
        appTitle: project.title,
        appDescription: project.description,
        appNamespace: project.namespace ?? '',
        ui5Theme: project.ui5Theme,
        ui5Version: appGenInfoCustom?.ui5Version || project.manifestMinUI5Version || project.ui5Version,
        enableCodeAssist: project.enableCodeAssist,
        enableEslint: project.enableEslint,
        enableTypeScript: project.enableTypeScript,
        showMockDataInfo: !!service.edmx && !service.capService,
        generatorVersion: appGenInfoCustom?.generatorVersion ?? '',
        template: appGenInfoCustom?.template ?? '',
        generatorName: appGenInfoCustom?.generatorName ?? '',
        entityRelatedConfig: appGenInfoCustom?.entityRelatedConfig ?? [],
        additionalEntries: appGenInfoCustom?.additionalEntries ?? [],
        launchText
    };

    generateAppGenInfo(targetPath, appGenInfo, fs);
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
