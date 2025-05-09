export const UI5_CDN_URL = 'https://ui5.sap.com';
export const UI5_VERSIONS_CDN_URL = 'https://sapui5.hana.ondemand.com/version.json';
export const UI5_VERSIONS_NEO_CDN_URL = 'https://ui5.sap.com/neo-app.json';
export const SNAPSHOT_CDN_URL = 'https://sapui5preview-sapui5.dispatcher.int.sap.eu2.hana.ondemand.com:443';

export const CURRENT_SYSTEM_VERSION = '(system version)';
export const LATEST_VERSION = '(latest)';
export const SNAPSHOT_VERSION = 'snapshot';
export const SNAPSHOT_UNTESTED_VERSION = 'snapshot-untested';

export const RESOURCE_BUNDLE_TEXT = '\n\n# This is the resource bundle for ';
export const TRANSLATION_UUID_TEXT = '\n#__ldi.translation.uuid=';
export const PROPERTIES_TEXT = '.properties';
export const MAIN_I18N_PATH = 'i18n/i18n.properties';
export const BASE_I18N_DESCRIPTION =
    '#Make sure you provide a unique prefix to the newly added keys in this file, to avoid overriding of SAP Fiori application keys.';

export const S4HANA_APPS_PARAMS = {
    'sap.app/type': 'application',
    'sap.fiori/cloudDevAdaptationStatus': 'released',
    'fields':
        'sap.app/id,repoName,sap.fiori/cloudDevAdaptationStatus,sap.app/ach,sap.fiori/registrationIds,sap.app/title,url,fileType'
};

export const ABAP_APPS_PARAMS = {
    'fields': 'sap.app/id,sap.app/ach,sap.fiori/registrationIds,sap.app/title,url,fileType,repoName',
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'fileType': 'appdescr'
};

export const ABAP_VARIANT_APPS_PARAMS = {
    'fields': 'sap.app/id,sap.app/ach,sap.fiori/registrationIds,sap.app/title,url,fileType,repoName',
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'fileType': 'appdescr_variant',
    'originLayer': 'VENDOR'
};
