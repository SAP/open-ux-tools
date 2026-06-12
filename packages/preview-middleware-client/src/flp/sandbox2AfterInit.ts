import type AppLifeCycle from 'sap/ushell/services/AppLifeCycle';
import type Component from 'sap/ui/core/Component';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';
import {
    addCardGenerationUserAction,
    registerForControllerExtensionErrors,
    resetAppState,
    startRtaForAppInstance
} from './common.js';
import initConnectors from './initConnectors.js';
import { getUi5Version } from '../utils/version.js';

/**
 * AfterFlpStart hook for FLP Sandbox 2.0.
 * Called by the sandbox after the FLP renderer is fully up (Container initialized,
 * renderer created and placed). Safe to use sap/ushell/Container at this point.
 */
export async function execute(): Promise<void> {
    // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-dom-access,@sap-ux/fiori-tools/sap-browser-api-warning
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const flex = bootstrapConfig?.dataset.openUxPreviewFlexSettings;
    const enableCardGenerator = !!bootstrapConfig?.dataset.openUxPreviewEnableCardGenerator;
    const enhancedHomePage = !!bootstrapConfig?.dataset.openUxPreviewEnhancedHomepage;

    const urlParams = new URLSearchParams(globalThis.location.search);
    const container = sap.ushell.Container;
    const ui5VersionInfo = await getUi5Version();

    // Reset app state unless explicitly suppressed
    if (urlParams.get('fiori-tools-iapp-state')?.toLocaleLowerCase() !== 'true') {
        await resetAppState(container);
    }

    // Wire up RTA if flex is configured — renderer is already up so we use AppLifeCycle directly
    if (flex) {
        registerForControllerExtensionErrors();
        const flexSettings = JSON.parse(flex) as FlexSettings;
        const lifecycleService = await container.getServiceAsync<AppLifeCycle>('AppLifeCycle');
        lifecycleService.attachAppLoaded((event) => {
            // Prevent starting RTA when the FLP home component fires attachAppLoaded before the user navigates to the actual app
            if (!globalThis.location.hash || globalThis.location.hash.startsWith('#Shell-home')) {
                return;
            }
            startRtaForAppInstance(event.getParameter('componentInstance'), flexSettings, ui5VersionInfo);
        });
    }

    // Wire up card generator if enabled
    if (enableCardGenerator) {
        const lifecycleService = await container.getServiceAsync<AppLifeCycle>('AppLifeCycle');
        lifecycleService.attachAppLoaded((event) => {
            addCardGenerationUserAction(event.getParameter('componentInstance') as unknown as Component, container);
        });
    }

    // Initialize RTA connectors
    await initConnectors();

    // Enhanced homepage requires an additional Container.init('cdm') call
    if (enhancedHomePage) {
        await container.init('cdm');
    }
}
