import Log from 'sap/base/Log';
import type { InitRtaScript, RTAPlugin, StartAdaptation } from 'sap/ui/rta/api/startAdaptation';
import { MessageBarType, SCENARIO, type Scenario } from '@sap-ux-private/control-property-editor-common';
import type { FlexSettings, RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import IconPool from 'sap/ui/core/IconPool';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import type AppState from 'sap/ushell/services/AppState';
import type Component from 'sap/ui/core/Component';
import type Extension from 'sap/ushell/services/Extension';
import type { CardGeneratorType } from 'sap/cards/ap/generator';
import { getManifestAppdescr } from '../adp/api-handler.js';
import { getError } from '../utils/error.js';
import { isLowerThanMinimalUi5Version, type Ui5VersionInfo } from '../utils/version.js';
import { sendInfoCenterMessage } from '../utils/info-center-message.js';

type GlobalErrorEvent = ErrorEvent | PromiseRejectionEvent;

const CONTROLLER_EXTENSION_PATH_REGEX = /\/changes\/coding\/.+\.(js|ts)/;

function extractError(event: GlobalErrorEvent): Error | undefined {
    if ('error' in event && event.error instanceof Error) {
        return event.error;
    }
    if ('reason' in event && event.reason instanceof Error) {
        return event.reason;
    }
    return undefined;
}

const reportControllerExtensionErrorToInfoCenter: (event: GlobalErrorEvent) => void = (event) => {
    const error = extractError(event);
    const stackTrace = error?.stack ?? '';
    if (!CONTROLLER_EXTENSION_PATH_REGEX.test(stackTrace)) {
        return;
    }
    void sendInfoCenterMessage({
        title: { key: 'CONTROLLER_EXTENSION_UNHANDLED_ERROR_TITLE' },
        description: error?.message ?? '',
        type: MessageBarType.error,
        details: stackTrace
    });
};

/**
 * Registers global event listeners for uncaught errors and unhandled promise rejections
 * to detect and report controller extension errors to the Info Center.
 */
export function registerForControllerExtensionErrors(): void {
    globalThis.addEventListener('error', reportControllerExtensionErrorToInfoCenter);
    globalThis.addEventListener('unhandledrejection', reportControllerExtensionErrorToInfoCenter);
}

export interface FlexChange {
    [key: string]: string | object | undefined;
    changeType: string;
    fileName: string;
    support: {
        generator?: string;
    };
}

export const CHANGES_API_PATH = '/preview/api/changes';

/**
 * SAPUI5 delivered namespaces from https://ui5.sap.com/#/api/sap
 */
const UI5_LIBS = [
    'sap.apf',
    'sap.base',
    'sap.chart',
    'sap.collaboration',
    'sap.f',
    'sap.fe',
    'sap.fileviewer',
    'sap.gantt',
    'sap.landvisz',
    'sap.m',
    'sap.ndc',
    'sap.ovp',
    'sap.rules',
    'sap.suite',
    'sap.tnt',
    'sap.ui',
    'sap.uiext',
    'sap.ushell',
    'sap.uxap',
    'sap.viz',
    'sap.webanalytics',
    'sap.zen'
];

interface Manifest {
    ['sap.ui5']?: {
        dependencies?: {
            libs: Record<string, unknown>;
            components: Record<string, unknown>;
        };
        componentUsages?: Record<string, { name: string }>;
    };
}

type AppIndexData = Record<
    string,
    {
        dependencies?: {
            url?: string;
            type?: string;
            componentId: string;
        }[];
    }
>;

function addKeys(dependency: Record<string, unknown>, customLibs: Record<string, true>): void {
    Object.keys(dependency).forEach(function (key) {
        if (
            !UI5_LIBS.some(function (substring) {
                return key === substring || key.startsWith(substring + '.');
            })
        ) {
            customLibs[key] = true;
        }
    });
}

function getComponentUsageNames(compUsages: Record<string, { name: string }>, customLibs: Record<string, true>): void {
    const compNames = Object.keys(compUsages).map(function (compUsageKey: string) {
        return compUsages[compUsageKey].name;
    });
    compNames.forEach(function (key) {
        if (
            !UI5_LIBS.some(function (substring) {
                return key === substring || key.startsWith(substring + '.');
            })
        ) {
            customLibs[key] = true;
        }
    });
}

async function getManifestLibs(appUrls: string[]): Promise<string> {
    const result = {} as Record<string, true>;
    const promises = [];
    for (const url of appUrls) {
        promises.push(
            fetch(`${url}/manifest.json`).then(async (resp) => {
                const manifest = (await resp.json()) as Manifest;
                if (manifest) {
                    if (manifest['sap.ui5']?.dependencies) {
                        if (manifest['sap.ui5'].dependencies.libs) {
                            addKeys(manifest['sap.ui5'].dependencies.libs, result);
                        }
                        if (manifest['sap.ui5'].dependencies.components) {
                            addKeys(manifest['sap.ui5'].dependencies.components, result);
                        }
                    }
                    if (manifest['sap.ui5']?.componentUsages) {
                        getComponentUsageNames(manifest['sap.ui5'].componentUsages, result);
                    }
                }
            })
        );
    }
    return Promise.all(promises).then(() => Object.keys(result).join(','));
}

function registerModules(dataFromAppIndex: AppIndexData) {
    Object.keys(dataFromAppIndex).forEach(function (moduleDefinitionKey) {
        const moduleDefinition = dataFromAppIndex[moduleDefinitionKey];
        if (moduleDefinition?.dependencies) {
            moduleDefinition.dependencies.forEach(function (dependency) {
                if (dependency.url && dependency.url.length > 0 && dependency.type === 'UI5LIB') {
                    Log.info('Registering Library ' + dependency.componentId + ' from server ' + dependency.url);
                    const compId = dependency.componentId.replaceAll('.', '/');
                    const config = {
                        paths: {} as Record<string, string>
                    };
                    config.paths[compId] = dependency.url;
                    sap.ui.loader.config(config);
                }
            });
        }
    });
}

/**
 * Retrieves Flex settings from a 'sap-ui-bootstrap' element's data attribute.
 * Parses the 'data-open-ux-preview-flex-settings' attribute as JSON.
 *
 * @returns {FlexSettings | undefined} The parsed Flex settings if available, otherwise undefined.
 */
export function getFlexSettings(): FlexSettings | undefined {
    let result: FlexSettings | undefined;
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const flexSetting = bootstrapConfig?.dataset.openUxPreviewFlexSettings;
    if (flexSetting) {
        result = JSON.parse(flexSetting) as FlexSettings;
    }
    return result;
}

/**
 * Fetch the app state from the given application urls, then reset the app state.
 *
 * @param container the UShell container
 */
export async function resetAppState(container: typeof sap.ushell.Container): Promise<void> {
    const urlParams = new URLSearchParams(globalThis.location.hash);
    const appStateValue = urlParams.get('sap-iapp-state') ?? urlParams.get('/?sap-iapp-state');
    if (appStateValue) {
        const appStateService = await container.getServiceAsync<AppState>('AppState');
        appStateService.deleteAppState(appStateValue);
    }
}

/**
 * Fetch the manifest from the given application urls, then parse them for custom libs, and finally request their urls.
 *
 * @param appUrls application urls
 * @param urlParams URLSearchParams object
 * @returns returns a promise when the registration is completed.
 */
export async function registerComponentDependencyPaths(appUrls: string[], urlParams: URLSearchParams): Promise<void> {
    const libs = await getManifestLibs(appUrls);
    if (libs && libs.length > 0) {
        let url = '/sap/bc/ui2/app_index/ui5_app_info?id=' + encodeURIComponent(libs);
        const sapClient = urlParams.get('sap-client');
        if (sapClient?.length === 3 && /^\d+$/.test(sapClient)) {
            url = url + '&sap-client=' + sapClient;
        }
        const response = await fetch(url);
        try {
            registerModules((await response.json()) as AppIndexData);
        } catch (error) {
            Log.error(`Registering of reuse libs failed. Error:${error}`);
        }
    }
}

/**
 * Register SAP fonts that are also registered in a productive Fiori launchpad.
 */
export function registerSAPFonts() {
    const fioriTheme = {
        fontFamily: 'SAP-icons-TNT',
        fontURI: sap.ui.require.toUrl('sap/tnt/themes/base/fonts/')
    };
    IconPool.registerFont(fioriTheme);
    const suiteTheme = {
        fontFamily: 'BusinessSuiteInAppSymbols',
        fontURI: sap.ui.require.toUrl('sap/ushell/themes/base/fonts/')
    };
    IconPool.registerFont(suiteTheme);
}

/**
 * Create Resource Bundle based on the scenario.
 *
 * @param scenario to be used for the resource bundle.
 */
export async function loadI18nResourceBundle(scenario: Scenario): Promise<ResourceBundle> {
    if (scenario === SCENARIO.AdaptationProject) {
        const manifest = await getManifestAppdescr();
        const enhanceWith = (manifest.content as { texts: { i18n: string } }[])
            .filter((content) => content.texts?.i18n)
            .map((content) => ({ bundleUrl: `../${content.texts.i18n}` }));
        return ResourceBundle.create({
            url: '../i18n/i18n.properties',
            enhanceWith
        });
    }
    return ResourceBundle.create({
        url: 'i18n/i18n.properties'
    });
}

/**
 * Read the application title from the resource bundle and set it as document title.
 *
 * @param resourceBundle resource bundle to read the title from.
 * @param i18nKey optional parameter to define the i18n key to be used for the title.
 */
export function setI18nTitle(resourceBundle: ResourceBundle, i18nKey = 'appTitle') {
    if (resourceBundle.hasText(i18nKey)) {
        document.title = resourceBundle.getText(i18nKey) ?? document.title;
    }
}

/**
 * Handle higher layer changes when starting UI Adaptation.
 * When RTA detects higher layer changes an error with Reload triggered text is thrown, the RTA instance is destroyed and the application is reloaded.
 * For UI5 version lower than 1.84.0 RTA is showing a popup with notification text about the detection of higher layer changes.
 *
 * @param error the error thrown when there are higher layer changes when starting UI Adaptation.
 * @param ui5VersionInfo ui5 version info
 */
export async function handleHigherLayerChanges(error: unknown, ui5VersionInfo: Ui5VersionInfo): Promise<void> {
    const err = getError(error);
    if (err.message.includes('Reload triggered')) {
        if (!isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 84 })) {
            await sendInfoCenterMessage({
                title: { key: 'HIGHER_LAYER_CHANGES_TITLE' },
                description: { key: 'HIGHER_LAYER_CHANGES_INFO_MESSAGE' },
                type: MessageBarType.warning
            });
        }
        globalThis.location.reload();
    }
}

/**
 * Starts UI adaptation (RTA) for the given component instance.
 * Contains the inner logic shared between sandbox 1 (sandbox1Init.ts) and sandbox 2 (sandbox2AfterInit.ts).
 *
 * @param view - the component instance returned by AppLifeCycle attachAppLoaded
 * @param flexSettings - the parsed flex settings
 * @param ui5VersionInfo - current UI5 version
 */
export function startRtaForAppInstance(
    view: unknown,
    flexSettings: FlexSettings,
    ui5VersionInfo: Ui5VersionInfo
): void {
    const pluginScript = flexSettings.pluginScript ?? '';
    const libs: string[] = [];

    if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 72 })) {
        libs.push('open/ux/preview/client/flp/initRta');
    } else {
        libs.push('sap/ui/rta/api/startAdaptation');
    }

    if (flexSettings.pluginScript) {
        libs.push(pluginScript as string);
        delete flexSettings.pluginScript;
    }

    const options: RTAOptions = {
        rootControl: view,
        validateAppVersion: false,
        flexSettings
    };

    sap.ui.require(
        libs,
        async function (startAdaptation: StartAdaptation | InitRtaScript, pluginScript: RTAPlugin) {
            try {
                await startAdaptation(options, pluginScript);
            } catch (error) {
                await sendInfoCenterMessage({
                    title: { key: 'FLP_ADAPTATION_START_FAILED_TITLE' },
                    description: getError(error).message,
                    type: MessageBarType.error
                });
                await handleHigherLayerChanges(error, ui5VersionInfo);
            }
        }
    );
}

/**
 * Dynamically adds a "Generate Card" action to the SAP Fiori Launchpad for the given component instance.
 *
 * @param componentInstance - The component instance for which the card generation action is added.
 * @param container - The SAP Fiori Launchpad container used to access services.
 */
export function addCardGenerationUserAction(
    componentInstance: Component,
    container: typeof sap.ushell.Container
): void {
    sap.ui.require(['sap/cards/ap/generator/CardGenerator'], async (CardGenerator: CardGeneratorType) => {
        const extensionService = await container.getServiceAsync<Extension>('Extension');
        const controlProperties = {
            icon: 'sap-icon://add',
            id: 'generate_card',
            text: 'Generate Card',
            tooltip: 'Generate Card',
            press: () => {
                CardGenerator.initializeAsync(componentInstance);
            }
        };
        const parameters = {
            controlType: 'sap.ushell.ui.launchpad.ActionItem'
        };
        const generateCardAction = await extensionService.createUserAction(controlProperties, parameters);
        generateCardAction.showForCurrentApp();
    });
}
