import { t } from '../utils/i18n';
import type { FioriStep } from './yeomanUiStepConfig';

export const LEGACY_CAP_TYPE_NODE = 'capNode';
export const LEGACY_CAP_TYPE_JAVA = 'capJava';

export const enum SapSystemSourceType {
    SCP = 'SCP',
    ON_PREM = 'ON_PREM',
    S4HC = 'S4HC'
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
        name: t('LABEL_FLOORPLAN_SELECTION'),
        description: t('LABEL_CHOOSE_FLOORPLAN'),
        order: 0
    },
    {
        key: STEP_DATASOURCE_AND_SERVICE,
        name: t('DATASOURCE_AND_SERVICE_SELECTION'),
        description: t('CONFIGURE_DATASOURCE_AND_SERVICE'),
        order: 1
    },
    {
        key: STEP_ENTITY,
        name: t('SERVICE_ENTITY_SELECTION'),
        description: t('LABEL_CONFIGURE_FLOORPLAN_SERVICE'),
        order: 2
    },
    {
        key: STEP_PROJECT_ATTRIBUTES,
        name: t('PROJECT_ATTRIBUTES'),
        description: t('CONFIGURE_MAIN_PROJECT_ATTRIBUTES'),
        order: 3
    },
    {
        key: STEP_DEPLOY_CONFIG,
        name: t('DEPLOYMENT_CONFIG'),
        description: t('CONFIGURE_DEPLOYMENT'),
        dependency: t('PROJECT_ATTRIBUTES'),
        order: 4
    },
    {
        key: STEP_FLP_CONFIG,
        name: t('FLP_CONFIG'),
        description: t('DESCRIPTION_FLP_CONFIG_GENERATOR'),
        dependency: t('PROJECT_ATTRIBUTES'),
        order: 5
    }
];

export const DEFAULT_HOST = 'http://localhost';
export const DEFAULT_CAP_HOST = 'http://localhost:4004';
export const DEFAULT_SERVICE_PATH = '/sap/opu/odata';
// Manifest constants
export const MAIN_DATASOURCE_NAME = 'mainService';
export const MAIN_MODEL_NAME = 'mainModel';

// todo: Create unified name
export const enum GeneratorName {
    FE = '@sap/generator-fiori-elements',
    FF = '@sap/generator-fiori-freestyle'
}

export const FPM_DEFAULT_PAGE_NAME = 'Main';
export const GUIDED_ANSWERS_EXTENSION_ID = 'saposs.sap-guided-answers-extension';
// App gen specific (not writer specific) supported UI5 versions
export const minSupportedUi5Version = '1.65.0';
export const minSupportedUi5VersionV4 = '1.84.0';
export const defaultNavActionTile = 'tile';
export const defaultNavActionDisplay = 'display';

/**
 * Represents a list of App Generator specific feature toggles.
 */
export enum Features {
    enableGAIntegration = 'enableGAIntegration' // Adds support for GA launch commands with GA links
}
