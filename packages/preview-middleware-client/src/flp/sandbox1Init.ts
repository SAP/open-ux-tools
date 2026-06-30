import Log from 'sap/base/Log';
import type AppLifeCycle from 'sap/ushell/services/AppLifeCycle';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';
import { SCENARIO, type Scenario } from '@sap-ux-private/control-property-editor-common';
import type Component from 'sap/ui/core/Component';
import IconPool from 'sap/ui/core/IconPool';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import { getError } from '../utils/error.js';
import initConnectors from './initConnectors.js';
import { getUi5Version } from '../utils/version.js';
import { getManifestAppdescr } from '../adp/api-handler.js';
import {
    addCardGenerationUserAction,
    registerComponentDependencyPaths,
    registerForControllerExtensionErrors,
    resetAppState,
    startRtaForAppInstance
} from './common.js';

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
 * Apply additional configuration and initialize sandbox.
 *
 * @param params init parameters read from the script tag
 * @param params.appUrls JSON containing a string array of application urls
 * @param params.flex JSON containing the flex configuration
 * @param params.customInit path to the custom init module to be called
 * @param params.enhancedHomePage boolean indicating if enhanced homepage is enabled
 * @returns promise
 */
export async function init({
    appUrls,
    flex,
    customInit,
    enhancedHomePage,
    enableCardGenerator
}: {
    appUrls?: string | null;
    flex?: string | null;
    customInit?: string | null;
    enhancedHomePage?: boolean | null;
    enableCardGenerator?: boolean;
}): Promise<void> {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const container =
        sap?.ushell?.Container ??
        ((await import('sap/ushell/Container')).default);
    let scenario: string = '';
    const ui5VersionInfo = await getUi5Version();
    // Register RTA if configured
    if (flex) {
        registerForControllerExtensionErrors();
        const flexSettings = JSON.parse(flex) as FlexSettings;
        scenario = flexSettings.scenario;
        container.attachRendererCreatedEvent(async function () {
            const lifecycleService = await container.getServiceAsync<AppLifeCycle>('AppLifeCycle');
            lifecycleService.attachAppLoaded((event) => {
                // Prevent starting RTA when the FLP home component (#Shell-home) fires attachAppLoaded before the user navigates to the actual app.
                if (!globalThis.location.hash || globalThis.location.hash.startsWith('#Shell-home')) {
                    return;
                }
                startRtaForAppInstance(event.getParameter('componentInstance'), flexSettings, ui5VersionInfo);
            });
        });
    }
    if (enableCardGenerator) {
        container.attachRendererCreatedEvent(async function () {
            const lifecycleService = await container.getServiceAsync<AppLifeCycle>('AppLifeCycle');
            lifecycleService.attachAppLoaded((event) => {
                const componentInstance = event.getParameter('componentInstance');
                addCardGenerationUserAction(componentInstance as unknown as Component, container);
            });
        });
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

    if (enhancedHomePage) {
        await container.init('cdm');
    }

    const renderer =
        ui5VersionInfo.major < 2 && !ui5VersionInfo.label?.includes('legacy-free')
            ? await container.createRenderer(undefined, true)
            : await container.createRendererInternal(undefined, true);
    renderer.placeAt('content');
}

// eslint-disable-next-line @sap-ux/fiori-tools/sap-no-dom-access,@sap-ux/fiori-tools/sap-browser-api-warning, @sap-ux/fiori-tools/sap-no-global-variable
const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
if (bootstrapConfig) {
    // DO NOT refactor to top-level await. This module is loaded via sap.ui.define (AMD),
    // and using `await` at the top level of an AMD module callback prevents sap.ui.define
    // from completing module registration.
    init({
        appUrls: bootstrapConfig.dataset.openUxPreviewLibsManifests,
        flex: bootstrapConfig.dataset.openUxPreviewFlexSettings,
        customInit: bootstrapConfig.dataset.openUxPreviewCustomInit,
        enhancedHomePage: !!bootstrapConfig.dataset.openUxPreviewEnhancedHomepage,
        enableCardGenerator: !!bootstrapConfig.dataset.openUxPreviewEnableCardGenerator
    }).catch((e) => {
        const error = getError(e);
        Log.error('Sandbox initialization failed: ' + error.message);
    });
}
