import { SCENARIO, type Scenario } from '@sap-ux-private/control-property-editor-common';
import { getUi5Version } from '../utils/version';
import { getError } from '../utils/error';
import Log from 'sap/base/Log';
import {
    attachRtaListener,
    loadI18nResourceBundle,
    registerComponentDependencyPaths,
    registerSAPFonts,
    resetAppState,
    setI18nTitle
} from './common';

/**
 * BeforeFlpStart hook for FLP Sandbox 2.0.
 * Called by the sandbox before the FLP starts. Must NOT call container.init() or createRenderer*().
 */
export async function execute(): Promise<void> {
    // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-dom-access,@sap-ux/fiori-tools/sap-browser-api-warning
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const appUrls = bootstrapConfig?.dataset.openUxPreviewLibsManifests;
    const flex = bootstrapConfig?.dataset.openUxPreviewFlexSettings;
    const customInit = bootstrapConfig?.dataset.openUxPreviewCustomInit;

    const urlParams = new URLSearchParams(globalThis.location.search);
    const container =
        sap?.ushell?.Container ??
        ((await import('sap/ushell/Container')).default as unknown as typeof sap.ushell.Container);

    const ui5VersionInfo = await getUi5Version();
    let scenario: string = SCENARIO.FioriElementsFromScratch;

    if (flex) {
        scenario = attachRtaListener(container, flex, ui5VersionInfo) ?? scenario;
    }

    if (urlParams.get('fiori-tools-iapp-state')?.toLocaleLowerCase() !== 'true') {
        await resetAppState(container);
    }

    if (appUrls) {
        await registerComponentDependencyPaths((JSON.parse(appUrls) as string[]) ?? [], urlParams);
    }

    if (customInit) {
        sap.ui.require([customInit]);
    }

    const resourceBundle = await loadI18nResourceBundle(scenario as Scenario);
    setI18nTitle(resourceBundle);
    registerSAPFonts();
}
