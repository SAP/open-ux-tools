import Log from 'sap/base/Log';
import type AppLifeCycle from 'sap/ushell/services/AppLifeCycle';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';
import type { Scenario } from '@sap-ux-private/control-property-editor-common';
import type Component from 'sap/ui/core/Component';
import { getError } from '../utils/error.js';
import initConnectors from './initConnectors.js';
import { getUi5Version, Ui5VersionInfo } from '../utils/version.js';
import {
    addCardGenerationUserAction,
    loadI18nResourceBundle,
    registerComponentDependencyPaths,
    registerForControllerExtensionErrors,
    registerSAPFonts,
    resetAppState,
    setI18nTitle,
    startRtaForAppInstance
} from './common.js';

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
        ((await import('sap/ushell/Container')).default as unknown as typeof sap.ushell.Container);
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
