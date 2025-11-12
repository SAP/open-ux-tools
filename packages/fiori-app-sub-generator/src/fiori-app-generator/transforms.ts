import { Authentication as DestinationAuthType, isAbapEnvironmentOnBtp } from '@sap-ux/btp-utils';
import type {
    ALPSettings,
    ALPSettingsV2,
    EntityConfig as EntityConfigFE,
    FEOPSettings,
    FPMSettings,
    FioriElementsApp,
    LROPSettings,
    OVPSettings,
    Template as TemplateSettingsFE
} from '@sap-ux/fiori-elements-writer';
import { OdataVersion, TemplateType as TemplateTypeFE } from '@sap-ux/fiori-elements-writer';
import type { FreestyleApp, Template as TemplateSettingsFF } from '@sap-ux/fiori-freestyle-writer';
import { TemplateType as TemplateTypeFF } from '@sap-ux/fiori-freestyle-writer';
import type { BasicAppSettings } from '@sap-ux/fiori-freestyle-writer/dist/types';
import { DatasourceType, type EntityRelatedAnswers } from '@sap-ux/odata-service-inquirer';
import { ServiceType } from '@sap-ux/odata-service-writer';
import { AuthenticationType } from '@sap-ux/store';
import { latestVersionString } from '@sap-ux/ui5-info';
import type { Floorplan, State } from '../types';
import {
    DEFAULT_HOST,
    DEFAULT_SERVICE_PATH,
    FPM_DEFAULT_PAGE_NAME,
    FloorplanFE,
    FloorplanFF,
    MAIN_DATASOURCE_NAME,
    MAIN_MODEL_NAME,
    UI5_VERSION_PROPS
} from '../types';
import {
    assignSapUxLayerValue,
    convertCapRuntimeToCapProjectType,
    generateToolsId,
    getAnnotations,
    getAppId,
    getMinSupportedUI5Version
} from '../utils';
import type { Package } from '@sap-ux/project-access';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import { hostEnvironment, getHostEnvironment } from '@sap-ux/fiori-generator-shared';

/**
 * Get the writer template type from the Fiori App floorplan.
 *
 * @param floorplan
 * @returns {TemplateTypeFE | TemplateTypeFF} - The template type
 */
export function getTemplateType(floorplan: Floorplan): TemplateTypeFE | TemplateTypeFF {
    const templateMap: Record<Floorplan, TemplateTypeFE | TemplateTypeFF> = {
        [FloorplanFE.FE_ALP]: 'alp',
        [FloorplanFE.FE_FEOP]: 'feop',
        [FloorplanFE.FE_LROP]: 'lrop',
        [FloorplanFE.FE_OVP]: 'ovp',
        [FloorplanFE.FE_WORKLIST]: 'worklist',
        [FloorplanFE.FE_FPM]: 'fpm',
        [FloorplanFF.FF_SIMPLE]: 'basic'
    };
    return templateMap[floorplan];
}

/**
 * Transform the Fiori App floorplan to the type required by the open source ux-tools writer modules.
 *
 * @param floorplan
 * @param entityRelatedConfig
 * @param viewName
 * @returns {Template} - The template configuration
 */
export function transformTemplateType(
    floorplan: Floorplan,
    entityRelatedConfig?: EntityRelatedAnswers,
    viewName?: string
): TemplateSettingsFE<{}> | TemplateSettingsFF<BasicAppSettings> {
    if (floorplan === FloorplanFF.FF_SIMPLE) {
        return {
            type: TemplateTypeFF.Basic, // We only support one template type now so it can be hardcoded
            settings: {
                viewName
            }
        };
    }
    // Since we have already returned the FF template type, we can safely cast the template type to TemplateTypeFE
    const templateType = getTemplateType(floorplan) as TemplateTypeFE;
    let _entityConfig: EntityConfigFE | undefined;

    if (entityRelatedConfig?.mainEntity) {
        _entityConfig = {
            mainEntityName: entityRelatedConfig.mainEntity.entitySetName
        };

        if (entityRelatedConfig.mainEntity.mainEntityParameterName) {
            _entityConfig.mainEntityParameterName = entityRelatedConfig.mainEntity.mainEntityParameterName;
        }

        if (entityRelatedConfig?.navigationEntity?.navigationPropertyName) {
            _entityConfig.navigationEntity = {
                EntitySet: entityRelatedConfig.navigationEntity?.entitySetName,
                Name: entityRelatedConfig.navigationEntity?.navigationPropertyName
            };
        }
    }

    // Add page title if addPageBuildingBlock is true
    const pageBuildingBlockConfig = entityRelatedConfig?.addPageBuildingBlock
        ? { pageBuildingBlockTitle: entityRelatedConfig.pageBuildingBlockTitle }
        : {};

    const templateSettingsMap = {
        [TemplateTypeFE.ListReportObjectPage]: {
            entityConfig: _entityConfig,
            tableType: entityRelatedConfig?.tableType,
            hierarchyQualifier: entityRelatedConfig?.hierarchyQualifier
        } as LROPSettings,
        [TemplateTypeFE.AnalyticalListPage]: {
            entityConfig: _entityConfig,
            selectionMode: entityRelatedConfig?.tableSelectionMode,
            tableType: entityRelatedConfig?.tableType,
            hierarchyQualifier: entityRelatedConfig?.hierarchyQualifier,
            autoHide: entityRelatedConfig?.tableAutoHide,
            multiSelect: entityRelatedConfig?.tableMultiSelect,
            qualifier: !entityRelatedConfig?.presentationQualifier
                ? undefined
                : entityRelatedConfig?.presentationQualifier,
            smartVariantManagement: entityRelatedConfig?.smartVariantManagement
        } as ALPSettings | ALPSettingsV2,
        [TemplateTypeFE.FormEntryObjectPage]: {
            entityConfig: _entityConfig
        } as FEOPSettings,
        [TemplateTypeFE.OverviewPage]: {
            filterEntitySet: entityRelatedConfig?.filterEntitySet?.entitySetName
        } as OVPSettings,
        [TemplateTypeFE.Worklist]: {
            entityConfig: _entityConfig,
            tableType: entityRelatedConfig?.tableType,
            hierarchyQualifier: entityRelatedConfig?.hierarchyQualifier
        },
        [TemplateTypeFE.FlexibleProgrammingModel]: {
            entityConfig: _entityConfig,
            ...pageBuildingBlockConfig,
            pageName: FPM_DEFAULT_PAGE_NAME
        } as FPMSettings
    };

    type templateSettingType = (typeof templateSettingsMap)[TemplateTypeFE];

    const fewTemplate: TemplateSettingsFE<templateSettingType> = {
        type: templateType,
        settings: templateSettingsMap[templateType]
    };
    return fewTemplate;
}

/**
 * Check if the template supports open test generation from the generators perspective.
 *
 * @param templateType
 * @returns {boolean} - true if the template supports open test generation from the generators perspective
 */
function canGenerateTests(templateType: TemplateTypeFE | TemplateTypeFF): boolean {
    return (
        (
            [
                TemplateTypeFE.FormEntryObjectPage,
                TemplateTypeFE.AnalyticalListPage,
                TemplateTypeFE.ListReportObjectPage,
                TemplateTypeFE.Worklist,
                TemplateTypeFE.FlexibleProgrammingModel
            ] as Array<TemplateTypeFE>
        ).includes(templateType as TemplateTypeFE) || templateType === TemplateTypeFF.Basic
    );
}

/**
 * Get the ui5 uri used in yaml and index files.
 *
 * @returns {string} - The UI5 URI
 */
function getUI5Uri(): string {
    // Remove any trailing '/' 2083 is the max length of a URL for some supported browsers
    const envSetUI5CdnUrl = process.env.UI5_CDN_URL?.replace(/\/{1,2083}$/, '');
    return envSetUI5CdnUrl ?? UI5_VERSION_PROPS.OFFICIAL_URL;
}

/**
 * Transform Fiori Tools State to the type required by the open source ux-tools module.
 * Process inputs to set correct defaults.
 *
 * @param state
 * @param state.project
 * @param state.service
 * @param state.floorplan
 * @param state.entityRelatedConfig
 * @param state.viewName
 * @param generateIndexHtml
 * @returns {FioriElementsApp<T>} - The app configuration
 */
export async function transformState<T>(
    { project, service, floorplan, entityRelatedConfig, viewName }: State,
    generateIndexHtml = true
): Promise<T> {
    const appConfig = getBaseAppConfig(
        { project, service, floorplan, entityRelatedConfig, viewName },
        generateIndexHtml
    );

    if (service.source !== DatasourceType.none) {
        appConfig.service = {
            url: service.host ?? (service.edmx ? undefined : DEFAULT_HOST),
            path: service.servicePath || DEFAULT_SERVICE_PATH,
            type: service.capService ? ServiceType.CDS : ServiceType.EDMX,
            version: service.version ?? OdataVersion.v4, // Wont be set for FF no datasource template flow so default to v4 for now as the service wont be written
            metadata: service.edmx && !service.capService ? service.edmx : undefined,
            name: MAIN_DATASOURCE_NAME,
            client: service.client,
            model: appConfig.template?.type === TemplateTypeFE.OverviewPage ? MAIN_MODEL_NAME : '', // OVP requires a named default model
            previewSettings: service.previewSettings ?? {},
            annotations:
                project.skipAnnotations !== true
                    ? await getAnnotations(project.name, service.annotations?.[0], service?.capService)
                    : undefined,
            ignoreCertError: service.ignoreCertError
        };

        const destinationName = service.destinationName ?? service.connectedSystem?.destination?.Name;
        if (destinationName) {
            appConfig.service.destination = {
                name: destinationName
            };
        }

        if (service.capService) {
            const { cdsUi5PluginInfo, ...capServiceInfo } = service.capService;
            appConfig.service.capService = {
                ...capServiceInfo,
                cdsUi5PluginInfo
            } as CapServiceCdsInfo;
        }

        if (
            service.destinationAuthType === DestinationAuthType.SAML_ASSERTION ||
            service.connectedSystem?.destination?.Authentication === DestinationAuthType.SAML_ASSERTION ||
            AuthenticationType.ReentranceTicket === service.connectedSystem?.backendSystem?.authenticationType ||
            // Apps generated with stored service keys (legacy) will use re-entrance tickets for connectivity
            // New stored systems will only use re-entrance
            service.connectedSystem?.backendSystem?.serviceKeys ||
            // If 'cloud' this will enable preview on VSCode (using re-entrance) for app portability
            (getHostEnvironment() === hostEnvironment.bas &&
                service.connectedSystem?.destination &&
                isAbapEnvironmentOnBtp(service.connectedSystem?.destination))
        ) {
            appConfig.service.previewSettings = { authenticationType: AuthenticationType.ReentranceTicket };
        } else if (service.apiHubConfig) {
            appConfig.service.previewSettings = { apiHub: true };
        }
    }

    return appConfig as T;
}

/**
 * Apply the default values for UI5 version if not specified. This should probably be done in the writers directly.
 *
 * @param floorplan
 * @param ui5Version
 * @param odataVersion
 * @returns the default ui5 version to be applied when calling the writers
 */
function getUI5VersionDefault(
    floorplan: Floorplan,
    ui5Version?: string,
    odataVersion?: OdataVersion
): {
    minUI5Version: string;
    ui5Version?: string;
} {
    if (!ui5Version || ui5Version === latestVersionString) {
        const minUI5Version = getMinSupportedUI5Version(odataVersion ?? OdataVersion.v4, floorplan);
        // If the UI5 version is not specified, we should use the minimum supported version for the given OData version as the manifest `minUI5Version`
        // `ui5Version` should not be specified as this allows the writers to use the correct version and generate ui5 bootstrap code without specifying the version
        return {
            minUI5Version
        };
    }
    return {
        minUI5Version: ui5Version,
        ui5Version
    };
}

/**
 * Get the base app configuration for the Fiori Elements or Freestyle app.
 * Which type of app is generated is determined by the template type derived from the floorplan specified.
 * This does not assign the service configuration.
 *
 * @param state
 * @param state.project
 * @param state.service
 * @param state.floorplan
 * @param state.entityRelatedConfig
 * @param state.viewName
 * @param generateIndexHtml
 * @returns
 */
function getBaseAppConfig(
    { project, service, floorplan, entityRelatedConfig, viewName }: State,
    generateIndexHtml: boolean
): Partial<FioriElementsApp<unknown>> | FreestyleApp<BasicAppSettings> {
    const appId = getAppId(project.name, project.namespace);
    const backendType = service.capService
        ? convertCapRuntimeToCapProjectType(service.capService.capType)
        : 'EDMXBackend';
    // FE or FF template settings
    const template = transformTemplateType(floorplan, entityRelatedConfig, viewName);
    type templateSetting = typeof template;
    const { minUI5Version, ui5Version } = getUI5VersionDefault(floorplan, project.ui5Version, service.version);

    const appConfig: templateSetting extends BasicAppSettings
        ? FreestyleApp<BasicAppSettings>
        : Partial<FioriElementsApp<unknown>> = {
        app: {
            id: appId,
            title: project.title,
            description: project.description,
            sourceTemplate: {
                toolsId: generateToolsId()
            },
            projectType: backendType
        },
        package: {
            name: project.name,
            description: project.description,
            version: '0.0.1',
            sapuxLayer: assignSapUxLayerValue(false)
        } as Package,
        ui5: {
            version: ui5Version,
            // descriptorVersion: project.manifestVersion, // The generator never sets this so no need to pass it
            ui5Theme: project.ui5Theme,
            localVersion: project.localUI5Version,
            minUI5Version: minUI5Version,
            frameworkUrl: service.capService ? UI5_VERSION_PROPS.BCP_OFFICIAL_URL : getUI5Uri(),
            // These 2 properties should be removed when: https://github.com/SAP/open-ux-tools/issues/2304 is implemented
            manifestLibs: floorplan === FloorplanFF.FF_SIMPLE ? ['sap.m', 'sap.ui.core'] : undefined,
            ui5Libs: []
        },
        appOptions: {
            codeAssist: project.enableCodeAssist,
            eslint: project.enableEslint,
            typescript: project.enableTypeScript,
            sapux: project.sapux,
            loadReuseLibs: !service.capService && !project.enableVirtualEndpoints,
            // Striclty speaking we should not need to guard here. If a template is not supported for OPA test generation then nothing should be generated.
            addTests: canGenerateTests(template.type),
            generateIndex: generateIndexHtml,
            addAnnotations: entityRelatedConfig?.addFEOPAnnotations || entityRelatedConfig?.addLineItemAnnotations,
            useVirtualPreviewEndpoints: project.enableVirtualEndpoints,
            addCdsUi5Plugin: project.addCdsUi5Plugin ?? true // Defaults to true
        },
        template: template as templateSetting extends BasicAppSettings
            ? TemplateSettingsFF<BasicAppSettings>
            : TemplateSettingsFE<unknown>
    };
    return appConfig;
}
