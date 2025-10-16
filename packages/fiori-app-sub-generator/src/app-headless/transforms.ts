import type { CapService } from '@sap-ux/cap-config-writer';
import { OdataVersion } from '@sap-ux/fiori-elements-writer';
import { getCapFolderPathsSync, type AppConfig } from '@sap-ux/fiori-generator-shared';
import { DatasourceType, type EntityRelatedAnswers } from '@sap-ux/odata-service-inquirer';
import { promptNames } from '@sap-ux/ui5-application-inquirer';
import { getDefaultUI5Theme, supportedUi5VersionFallbacks } from '@sap-ux/ui5-info';
import { join } from 'node:path';
import type { FEAppConfig, FFAppConfig, Project, Service, State } from '../types';
import { ApiHubType, FloorplanFE, FloorplanFF, capTypeConversion, defaultPromptValues } from '../types';
import { getODataVersion, t } from '../utils';

const APP_CONFIG_CURRENT_VERSION = '0.2';
/**
 * Transforms the external state to its internal representation.
 *
 * @param appConfig - defines the application to be generated
 * @returns the internal state representation
 */
export function transformExtState(appConfig: FEAppConfig | FFAppConfig): State {
    if (appConfig.version !== APP_CONFIG_CURRENT_VERSION) {
        throw Error(t('error.appConfigVersion', { versions: APP_CONFIG_CURRENT_VERSION }));
    }
    const { project: projectConfig, service: serviceConfig, floorplan } = appConfig;

    const state: State = {
        project: _setProjectDefaults(projectConfig),
        service: _setServiceDefaults(floorplan, serviceConfig),
        floorplan:
            FloorplanFE[floorplan as keyof typeof FloorplanFE] ?? FloorplanFF[floorplan as keyof typeof FloorplanFF]
    };

    if (state.service.capService) {
        state.project.targetFolder = join(state.service.capService.projectPath, state.service.capService.appPath ?? '');
    }

    // FE specific state properties
    if (floorplan !== 'FF_SIMPLE' && (appConfig as FEAppConfig).entityConfig) {
        state.entityRelatedConfig = _setEntityRelatedConfig(appConfig as FEAppConfig);
        if (serviceConfig?.annotations) {
            state.service.annotations = Array.isArray(serviceConfig.annotations)
                ? serviceConfig?.annotations
                : [serviceConfig?.annotations];
        }
    } else if (appConfig.floorplan === 'FF_SIMPLE') {
        // FF specific state properties
        state.viewName = (appConfig as FFAppConfig).project.viewName;
    }
    return state;
}

/**
 * Set the entity related configuration based on the specified AppConfig.entityConfig property.
 *
 * @param feAppConfig
 * @returns
 */
function _setEntityRelatedConfig(feAppConfig: FEAppConfig): EntityRelatedAnswers {
    const entityRelatedConfig: EntityRelatedAnswers = {
        // Table config
        hierarchyQualifier: feAppConfig.entityConfig?.hierarchyQualifier,
        tableType: feAppConfig.entityConfig?.tableType,
        // Annotation generator options
        addFEOPAnnotations: feAppConfig.entityConfig?.generateFormAnnotations,
        addLineItemAnnotations: feAppConfig.entityConfig?.generateLROPAnnotations
    };
    if (feAppConfig.alpOptions) {
        // Alp table specific config
        entityRelatedConfig.tableAutoHide = feAppConfig.alpOptions?.autoHide;
        entityRelatedConfig.tableMultiSelect = feAppConfig.alpOptions?.multiSelect;
        entityRelatedConfig.presentationQualifier = feAppConfig.alpOptions?.qualifier;
        entityRelatedConfig.tableSelectionMode = feAppConfig.alpOptions?.selectionMode;
        entityRelatedConfig.smartVariantManagement = feAppConfig.alpOptions?.smartVariantManagement;
    }
    if (feAppConfig.entityConfig?.mainEntity) {
        entityRelatedConfig.mainEntity = {
            entitySetName: feAppConfig.entityConfig.mainEntity.entityName,
            entitySetType: feAppConfig.entityConfig.mainEntity.type
        };
    }
    if (feAppConfig.entityConfig?.navigationEntity) {
        entityRelatedConfig.navigationEntity = {
            entitySetName: feAppConfig.entityConfig.navigationEntity.EntitySet,
            navigationPropertyName: feAppConfig.entityConfig?.navigationEntity.Name
        };
    }
    if (feAppConfig.entityConfig?.filterEntityType) {
        entityRelatedConfig.filterEntitySet = {
            entitySetName: feAppConfig.entityConfig.filterEntityType,
            entitySetType: feAppConfig.entityConfig.filterEntityType
        };
    }
    return entityRelatedConfig;
}

/**
 * Set the project defaults based on the specified AppConfig.project property.
 *
 * @param project
 * @returns
 */
function _setProjectDefaults(project: AppConfig['project']): Project {
    // Use latest fallback (offline) version if none specified
    const ui5Version = project.ui5Version || supportedUi5VersionFallbacks[0].version;

    return {
        name: project.name ?? t('defaults.projectName'),
        targetFolder: project.targetFolder ?? process.cwd(),
        namespace: project.namespace ?? '',
        title: project.title ?? t('defaults.projectTitle'),
        description: project.description ?? t('default.projectDescription'),
        ui5Version: ui5Version,
        localUI5Version: project.localUI5Version ?? ui5Version,
        ui5Theme: project.ui5Theme ?? getDefaultUI5Theme(ui5Version),
        skipAnnotations: project.skipAnnotations || defaultPromptValues[promptNames.skipAnnotations],
        enableCodeAssist: project.enableCodeAssist || defaultPromptValues[promptNames.enableCodeAssist],
        enableEslint: project.enableEslint || defaultPromptValues[promptNames.enableEslint],
        enableTypeScript: project.enableTypeScript || defaultPromptValues[promptNames.enableTypeScript],
        sapux: project.sapux || false,
        flpAppId: '' // Mandatory property, will be generated in the writing phase transforms and overwritten
    };
}

/**
 * Set the service defaults based on the specified AppConfig.service property.
 *
 * @param floorplan
 * @param service - AppConfig service definition
 * @throws Error - If neither an edmx nor capService are present an error will be thrown
 * @returns
 */
function _setServiceDefaults(floorplan: AppConfig['floorplan'], service?: AppConfig['service']): Service {
    let version;
    if (service?.edmx) {
        version = getODataVersion(service.edmx);
    } else if (floorplan !== 'FF_SIMPLE' && !service?.capService?.projectPath) {
        throw Error(t('error.appConfigMissingRequiredProperty', { propertyName: 'edmx' }));
    } else if (floorplan === 'FF_SIMPLE') {
        // FF_SIMPLE with no datasource
        return {
            source: DatasourceType.none
        };
    }

    const serviceDefaults = {
        host: service?.host,
        servicePath: service?.servicePath,
        client: service?.client,
        edmx: service?.edmx,
        version
    } as Service;

    if (service?.destination) {
        serviceDefaults.destinationName = service.destination;
        serviceDefaults.source = DatasourceType.sapSystem;
        return serviceDefaults;
    }

    // Only support non-enterprise api hub currently from headless generator
    if (service?.apiHubApiKey) {
        serviceDefaults.apiHubConfig = {
            apiHubKey: service.apiHubApiKey,
            apiHubType: ApiHubType.apiHub
        };
        serviceDefaults.source = DatasourceType.businessHub;
    }
    // Setting of DatasourceType has only partial relevance for the writing phase.
    // Only FILE and CAP are checked during the writing phase, but these references should be (eventually) removed
    // and replaced with generic checks for servicePath + edmx and cap service name respectively - then there is no need to set here
    else if (service?.capService?.projectPath) {
        if (!service.capService.serviceName) {
            throw Error(
                t('error.appConfigMissingRequiredProperty', {
                    propertyName: 'capService.serviceName'
                })
            );
        }
        serviceDefaults.capService = _setCAPServicePaths(service.capService);
        serviceDefaults.version = OdataVersion.v4; // CAP is always odata 4
        serviceDefaults.source = DatasourceType.capProject;
    } else if (!service?.servicePath && service?.edmx) {
        serviceDefaults.source = DatasourceType.metadataFile;
    } else if (!service?.edmx) {
        serviceDefaults.source = DatasourceType.none;
    } else if (service?.scp) {
        serviceDefaults.source = DatasourceType.sapSystem;
    } else {
        serviceDefaults.source = DatasourceType.odataServiceUrl;
    }
    return serviceDefaults;
}

/**
 * Sets the CapService properties.
 *
 * @param capService
 * @returns
 */
function _setCAPServicePaths(capService: CapService): CapService {
    const capCustomPaths = getCapFolderPathsSync(capService.projectPath);

    return {
        // Use target folder for testing as capService.projectPath is an absolute path
        projectPath: capService.projectPath,
        serviceName: capService.serviceName,
        serviceCdsPath: capService.serviceCdsPath,
        // targetFolder ends in /app so step-up 1 dir
        appPath: capCustomPaths?.app,
        capType: capTypeConversion(capService.capType)
    };
}
