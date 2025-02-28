import Log from 'sap/base/Log';
import type AppLifeCycle from 'sap/ushell/services/AppLifeCycle';
import type { InitRtaScript, RTAPlugin, StartAdaptation } from 'sap/ui/rta/api/startAdaptation';
import { SCENARIO, showMessage, type Scenario } from '@sap-ux-private/control-property-editor-common';
import type { FlexSettings, RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import IconPool from 'sap/ui/core/IconPool';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import AppState from 'sap/ushell/services/AppState';
import Pages from 'sap/ushell/services/Pages';
import { getManifestAppdescr } from '../adp/api-handler';
import { getError } from '../utils/error';
import initConnectors from './initConnectors';
import { getUi5Version, isLowerThanMinimalUi5Version, Ui5VersionInfo } from '../utils/version';
import { CommunicationService } from '../cpe/communication-service';
import { getTextBundle } from '../i18n';

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

/**
 * Check whether a specific dependency is a custom library, and if yes, add it to the map.
 *
 * @param dependency dependency from the manifest
 * @param customLibs map containing the required custom libraries
 */
function addKeys(dependency: Record<string, unknown>, customLibs: Record<string, true>): void {
    Object.keys(dependency).forEach(function (key) {
        // ignore libs or Components that start with SAPUI5 delivered namespaces
        if (
            !UI5_LIBS.some(function (substring) {
                return key === substring || key.startsWith(substring + '.');
            })
        ) {
            customLibs[key] = true;
        }
    });
}

/**
 * Check whether a specific ComponentUsage is a custom component, and if yes, add it to the map.
 *
 * @param compUsages ComponentUsage from the manifest
 * @param customLibs map containing the required custom libraries
 */
function getComponentUsageNames(compUsages: Record<string, { name: string }>, customLibs: Record<string, true>): void {
    const compNames = Object.keys(compUsages).map(function (compUsageKey: string) {
        return compUsages[compUsageKey].name;
    });
    compNames.forEach(function (key) {
        // ignore libs or Components that start with SAPUI5 delivered namespaces
        if (
            !UI5_LIBS.some(function (substring) {
                return key === substring || key.startsWith(substring + '.');
            })
        ) {
            customLibs[key] = true;
        }
    });
}

/**
 * Fetch the manifest for all the given application urls and generate a string containing all required custom library ids.
 *
 * @param appUrls urls pointing to included applications
 * @returns Promise of a comma separated list of all required libraries.
 */
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
                    const compId = dependency.componentId.replace(/\./g, '/');
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
 * Triggers the adaptation process for the given UI5 application.
 *
 * @param {FlexSettings} flexSettings - The settings for the flexibility services.
 * @param {Ui5VersionInfo} ui5VersionInfo - The version information of the UI5 framework.
 * @returns A promise that resolves when the adaptation process is triggered.
 *
 */
async function triggerAdaptation(flexSettings: FlexSettings, ui5VersionInfo: Ui5VersionInfo): Promise<void> {
    const container = sap?.ushell?.Container ?? ((await import('sap/ushell/Container')).default as unknown as typeof sap.ushell.Container);
    const lifecycleService = await container.getServiceAsync<AppLifeCycle>('AppLifeCycle');
    lifecycleService.attachAppLoaded((event) => {
        const view = event.getParameter('componentInstance');
        const pluginScript = flexSettings.pluginScript ?? '';

        let libs: string[] = [];

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
            // eslint-disable-next-line no-shadow
            async function (startAdaptation: StartAdaptation | InitRtaScript, pluginScript: RTAPlugin) {
                try {
                    await startAdaptation(options, pluginScript);
                } catch (error) {
                    await handleHigherLayerChanges(error, ui5VersionInfo);
                }
            }
        );
    });
}

/**
 * Fetch the app state from the given application urls, then reset the app state.
 *
 * @param container the UShell container
 */
export async function resetAppState(container: typeof sap.ushell.Container): Promise<void> {
    const urlParams = new URLSearchParams(window.location.hash);
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
        let url = '/sap/bc/ui2/app_index/ui5_app_info?id=' + libs;
        const sapClient = urlParams.get('sap-client');
        if (sapClient && sapClient.length === 3) {
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
    //Fiori Theme font family and URI
    const fioriTheme = {
        fontFamily: 'SAP-icons-TNT',
        fontURI: sap.ui.require.toUrl('sap/tnt/themes/base/fonts/')
    };
    //Registering to the icon pool
    IconPool.registerFont(fioriTheme);
    //SAP Business Suite Theme font family and URI
    const suiteTheme = {
        fontFamily: 'BusinessSuiteInAppSymbols',
        fontURI: sap.ui.require.toUrl('sap/ushell/themes/base/fonts/')
    };
    //Registering to the icon pool
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
 * Apply additional configuration and initialize sandbox.
 *
 * @param params init parameters read from the script tag
 * @param params.appUrls JSON containing a string array of application urls
 * @param params.flex JSON containing the flex configuration
 * @param params.customInit path to the custom init module to be called
 * @param params.newHomePage boolean indicating if new homepage is enabled
 * @returns promise
 */
export async function init({
    appUrls,
    flex,
    customInit,
    newHomePage
}: {
    appUrls?: string | null;
    flex?: string | null;
    customInit?: string | null;
    newHomePage?: boolean | null;
}): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const container =
        sap?.ushell?.Container ??
        ((await import('sap/ushell/Container')).default as unknown as typeof sap.ushell.Container);
    let scenario: string = '';
    const ui5VersionInfo = await getUi5Version();
    // Register RTA if configured
    if (flex) {
        const flexSettings = JSON.parse(flex) as FlexSettings;
        scenario = flexSettings.scenario;

        // Attach renderer created event to trigger adaptation, or trigger adaptation directly if newHomePage is enabled
        // as the ushell is bootstrapped via cdm where the renderer is cretead before the init script is executed
        if (!newHomePage) {
            container.attachRendererCreatedEvent(triggerAdaptation.bind(null, flexSettings, ui5VersionInfo));
        } else {
            await triggerAdaptation(flexSettings, ui5VersionInfo);
        }
    }

    // disable implicit personalisation save if new home page is enabled
    if (newHomePage) {
        const pages = await container.getServiceAsync<Pages>('Pages');
        pages.enableImplicitSave(false);
    }

    // reset app state if requested
    if (urlParams.get('fiori-tools-iapp-state')?.toLocaleLowerCase() !== 'true') {
        await resetAppState(container);
    }

    // Load custom library paths if configured
    if (appUrls) {
        await registerComponentDependencyPaths((JSON.parse(appUrls) as string[]) ?? [], urlParams);
    }

    // Load rta connector
    await initConnectors();

    // Load custom initialization module
    if (customInit) {
        sap.ui.require([customInit]);
    }

    // init
    const resourceBundle = await loadI18nResourceBundle(scenario as Scenario);
    setI18nTitle(resourceBundle);
    registerSAPFonts();

    if (!document.getElementById('canvas')) {
        const renderer =
            ui5VersionInfo.major < 2
                ? await container.createRenderer(undefined, true)
                : await container.createRendererInternal(undefined, true);
        renderer.placeAt('content');
    }
}

// eslint-disable-next-line fiori-custom/sap-no-dom-access,fiori-custom/sap-browser-api-warning
const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
if (bootstrapConfig) {
    init({
        appUrls: bootstrapConfig.getAttribute('data-open-ux-preview-libs-manifests'),
        flex: bootstrapConfig.getAttribute('data-open-ux-preview-flex-settings'),
        customInit: bootstrapConfig.getAttribute('data-open-ux-preview-customInit'),
        newHomePage: !!bootstrapConfig.getAttribute('data-open-ux-preview-new-homePage')
    }).catch((e) => {
        const error = getError(e);
        Log.error('Sandbox initialization failed: ' + error.message);
    });
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
            const bundle = await getTextBundle();
            const action = showMessage({
                message: bundle.getText('HIGHER_LAYER_CHANGES_INFO_MESSAGE'),
                shouldHideIframe: false
            });
            CommunicationService.sendAction(action);
        }

        // eslint-disable-next-line fiori-custom/sap-no-location-reload
        window.location.reload();
    }
}
