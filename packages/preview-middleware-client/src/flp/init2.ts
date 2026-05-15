import { registerComponentDependencyPaths } from './common';

/**
 * BeforeFlpStart hook for FLP Sandbox 2.0.
 * Called by the sandbox before the FLP starts. Must NOT require sap/ushell modules —
 * Container is not yet initialised at this point (StartSandbox.js loads it after this hook).
 * TODO: wire up attachRtaListener and resetAppState once the correct post-Container hook is confirmed.
 */
export async function execute(): Promise<void> {
    // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-dom-access,@sap-ux/fiori-tools/sap-browser-api-warning
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const appUrls = bootstrapConfig?.dataset.openUxPreviewLibsManifests;
    const customInit = bootstrapConfig?.dataset.openUxPreviewCustomInit;

    const urlParams = new URLSearchParams(globalThis.location.search);

    if (appUrls) {
        await registerComponentDependencyPaths((JSON.parse(appUrls) as string[]) ?? [], urlParams);
    }

    if (customInit) {
        sap.ui.require([customInit]);
    }
}
