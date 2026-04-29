import Log from 'sap/base/Log';
import type AppLifeCycle from 'sap/ushell/services/AppLifeCycle';
import type Component from 'sap/ui/core/Component';
import type Extension from 'sap/ushell/services/Extension';
import type { CardGeneratorType } from 'sap/cards/ap/generator';
import { getError } from '../utils/error';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../utils/version';
import initConnectors from './initConnectors';
import {
    attachRtaListener,
    loadI18nResourceBundle,
    registerComponentDependencyPaths,
    registerSAPFonts,
    resetAppState,
    setI18nTitle
} from './common';
export { handleHigherLayerChanges } from './common';
import type { Scenario } from '@sap-ux-private/control-property-editor-common';

function addCardGenerationUserAction(componentInstance: Component, container: typeof sap.ushell.Container) {
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

    if (flex) {
        scenario = attachRtaListener(container, flex, ui5VersionInfo) ?? scenario;
    }
    if (enableCardGenerator && !isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 121 })) {
        container.attachRendererCreatedEvent(async function () {
            const lifecycleService = await container.getServiceAsync<AppLifeCycle>('AppLifeCycle');
            lifecycleService.attachAppLoaded((event) => {
                const componentInstance = event.getParameter('componentInstance');
                addCardGenerationUserAction(componentInstance as unknown as Component, container);
            });
        });
    } else {
        Log.warning('Card generator is not supported for the current UI5 version.');
    }

    if (urlParams.get('fiori-tools-iapp-state')?.toLocaleLowerCase() !== 'true') {
        await resetAppState(container);
    }

    if (appUrls) {
        await registerComponentDependencyPaths((JSON.parse(appUrls) as string[]) ?? [], urlParams);
    }

    await initConnectors();

    if (customInit) {
        sap.ui.require([customInit]);
    }

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
