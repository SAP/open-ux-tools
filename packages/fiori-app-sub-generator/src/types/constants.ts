import { t } from '../utils/i18n';
import type { FioriStep } from './yeomanUiStepConfig';

export const LEGACY_CAP_TYPE_NODE = 'capNode';
export const LEGACY_CAP_TYPE_JAVA = 'capJava';

export const enum SapSystemSourceType {
    ABAP_CLOUD = 'abapCloud',
    ON_PREM = 'onPrem'
}

export const PLATFORMS = {
    VSCODE: {
        name: 'Visual Studio Code',
        technical: 'VSCode'
    },
    SBAS: {
        name: 'SAP Business Application Studio',
        technical: 'SBAS'
    },
    CLI: {
        name: 'CLI',
        technical: 'CLI'
    }
};

export const UI5_VERSION_PROPS = {
    OFFICIAL_URL: 'https://ui5.sap.com',
    BCP_OFFICIAL_URL: 'https://sapui5.hana.ondemand.com',
    SNAPSHOT_URL: 'https://sapui5preview-sapui5.dispatcher.int.sap.eu2.hana.ondemand.com',
    VERSIONS_FILE: 'neo-app.json'
};

export const SAP_CLIENT_KEY = 'sap-client';

export const API_HUB_API_KEY = 'API_HUB_API_KEY';
export const API_HUB_TYPE = 'API_HUB_TYPE';

export const enum ApiHubType {
    apiHub = 'API_HUB',
    apiHubEnterprise = 'API_HUB_ENTERPRISE'
}

export const STEP_FLOORPLAN = 'FLOORPLAN';
export const STEP_DATASOURCE_AND_SERVICE = 'DATASOURCE_AND_SERVICE';
export const STEP_ENTITY = 'ENTITY';
export const STEP_PROJECT_ATTRIBUTES = 'PROJECT_ATTRIBUTES';
export const STEP_DEPLOY_CONFIG = 'DEPLOY_CONFIG';
export const STEP_FLP_CONFIG = 'FLP_CONFIG';

// All steps keyed on name
export const FIORI_STEPS: FioriStep[] = [
    {
        key: STEP_FLOORPLAN,
        name: t('steps.templateSelection.title'),
        description: t('steps.templateSelection.description'),
        order: 0
    },
    {
        key: STEP_DATASOURCE_AND_SERVICE,
        name: t('steps.datasourceAndServiceSelection.title'),
        description: t('steps.datasourceAndServiceSelection.description'),
        order: 1
    },
    {
        key: STEP_ENTITY,
        name: t('steps.entityOrViewConfig.title'),
        description: t('steps.entityOrViewConfig.description'),
        order: 2
    },
    {
        key: STEP_PROJECT_ATTRIBUTES,
        name: t('steps.projectAttributesConfig.title'),
        description: t('steps.projectAttributesConfig.description'),
        order: 3
    },
    {
        key: STEP_DEPLOY_CONFIG,
        name: t('steps.deployConfig.title'),
        description: t('steps.deployConfig.description'),
        dependency: t('steps.projectAttributesConfig.title'),
        order: 4
    },
    {
        key: STEP_FLP_CONFIG,
        name: t('steps.flpConfig.title'),
        description: t('steps.flpConfig.description'),
        dependency: t('steps.projectAttributesConfig.title'),
        order: 5
    }
];

export const DEFAULT_HOST = 'http://localhost';
export const DEFAULT_CAP_HOST = 'http://localhost:4004';
export const DEFAULT_SERVICE_PATH = '/sap/opu/odata';
// Manifest constants
export const MAIN_DATASOURCE_NAME = 'mainService';
export const MAIN_MODEL_NAME = 'mainModel';

// The generator name to appear in README.md, telemetry events and logs
export const generatorName = 'SAP Fiori Application Generator';

export const FPM_DEFAULT_PAGE_NAME = 'Main';
// App gen specific (not writer specific) supported UI5 versions
export const minSupportedUi5Version = '1.65.0';
export const minSupportedUi5VersionV4 = '1.84.0';
// The minimum UI5 version required for page building block feature
export const minUi5VersionForPageBuildingBlock = '1.136.0';
export const defaultNavActionTile = 'tile';
export const defaultNavActionDisplay = 'display';

/**
 * Represents a list of App Generator specific feature toggles.
 */
export enum Features {
    enableGAIntegration = 'enableGAIntegration' // Adds support for GA launch commands with GA links
}
