import Log from 'sap/base/Log';
import type { InitRtaScript, RTAPlugin, StartAdaptation } from 'sap/ui/rta/api/startAdaptation';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import type { FlexSettings, RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type AppState from 'sap/ushell/services/AppState';
import type Component from 'sap/ui/core/Component';
import type Extension from 'sap/ushell/services/Extension';
import type { CardGeneratorType } from 'sap/cards/ap/generator';
import { getError } from '../utils/error.js';
import { getUI5Libs, isLowerThanMinimalUi5Version, type Ui5VersionInfo } from '../utils/version.js';
import { sendInfoCenterMessage } from '../utils/info-center-message.js';
import type { Manifest } from '@sap-ux/project-access';

type GlobalErrorEvent = ErrorEvent | PromiseRejectionEvent;

const CONTROLLER_EXTENSION_PATH_REGEX = /\/changes\/coding\/.+\.(js|ts)/;

/**
 * Extracts an Error object from a global error event.
 * Handles both synchronous errors (ErrorEvent) and unhandled promise rejections (PromiseRejectionEvent).
 *
 * @param {GlobalErrorEvent} event - The global error or unhandled rejection event.
 * @returns {Error | undefined} The extracted Error instance, or undefined if no Error could be extracted.
 */
function extractError(event: GlobalErrorEvent): Error | undefined {
    if ('error' in event && event.error instanceof Error) {
        return event.error;
    }
    if ('reason' in event && event.reason instanceof Error) {
        return event.reason;
    }
    return undefined;
}

/**
 * Reports controller extension errors to the Info Center.
 * Filters events by checking if the stack trace contains 'ControllerExtension',
 * and sends matching errors as error-level messages to the Info Center panel.
 *
 * @param {GlobalErrorEvent} event - The global error or unhandled rejection event.
 */
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

/**
 * Check whether the given keys are custom libraries, and if yes, add them to the set.
 *
 * @param keys array of library or component names
 * @returns Promise of a set of custom library or component names.
 */
async function getCustomKeys(keys: string[]): Promise<Set<string>> {
    const ui5LibSet = await getUI5Libs();
    return new Set(keys.filter((key) => !ui5LibSet.has(key)));
}

/**
 * Fetch the manifest for all the given application urls and generate a string containing all required custom library ids.
 *
 * @param appUrls urls pointing to included applications
 * @returns Promise of a comma separated list of all required libraries.
 */
async function getManifestLibs(appUrls: string[]): Promise<string> {
    const result = new Set<string>();

    await Promise.all(
        appUrls.map(async (url) => {
            const response = await fetch(`${url}/manifest.json`);
            if (!response.ok) {
                Log.error(`Failed to fetch app manifest. Status: ${response.status} ${response.statusText}`);
                return;
            }
            const manifest = (await response.json()) as Manifest;
            const sapUi5 = manifest['sap.ui5'];

            for (const key of ['libs', 'components'] as const) {
                const dependencies = sapUi5?.dependencies?.[key];
                if (dependencies) {
                    for (const lib of await getCustomKeys(Object.keys(dependencies))) {
                        result.add(lib);
                    }
                }
            }

            const componentUsages = sapUi5?.componentUsages;
            if (componentUsages) {
                const compNames = Object.values(componentUsages).map((componentUsage) => componentUsage.name);
                for (const key of await getCustomKeys(compNames)) {
                    result.add(key);
                }
            }
        })
    );

    return Array.from(result).join(',');
}

/**
 * Register the custom libraries and their url with the UI5 loader.
 *
 * @param dataFromAppIndex data returned from the app index service
 */
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
    const { pluginScript, ...flexSettingsWithoutPlugin } = flexSettings;
    const libs: string[] = [];

    if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 72 })) {
        libs.push('open/ux/preview/client/flp/initRta');
    } else {
        libs.push('sap/ui/rta/api/startAdaptation');
    }

    if (pluginScript) {
        libs.push(pluginScript as string);
    }

    const options: RTAOptions = {
        rootControl: view,
        validateAppVersion: false,
        flexSettings: flexSettingsWithoutPlugin
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
