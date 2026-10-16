import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';
import { registerComponentDependencyPaths } from './common.js';

/**
 * Registers the ADP variant's `changes` namespace to resolve against the local dev server.
 *
 * In FLP Sandbox 2.0 the CDM registers the ADP variant component namespace (e.g. `adp/v2app`)
 * against the backend URL so the base app Component/manifest load from the backend. That would
 * also route flex-change resources (fragments, code extensions under `<namespace>/changes/...`)
 * to the backend. This registers the more-specific `<namespace>/changes` sub-path to the local
 * dev-server root so UI5's longest-prefix loader resolution serves those local files, matching
 * Sandbox 1 behaviour. The base component namespace registration is left untouched.
 *
 * @param projectId the ADP variant id (e.g. `adp.v2app`), as provided in flexSettings
 * @param baseUrl the local base URL prefix for the dev server (maybe empty)
 */
function registerAdpChangesResourceRoot(projectId: string, baseUrl = ''): void {
    if (!projectId) {
        return;
    }
    const namespace = `${projectId.replaceAll('.', '/')}/changes`;
    const config = {
        paths: {} as Record<string, string>
    };
    config.paths[namespace] = `${baseUrl}/changes`;
    sap.ui.loader.config(config);
}

/**
 * BeforeFlpStart hook for FLP Sandbox 2.0.
 * Called by the sandbox before the FLP starts. Must NOT require sap/ushell modules —
 * Container is not yet initialized at this point (StartSandbox.js loads it after this hook).
 */
export async function execute(): Promise<void> {
    // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-dom-access,@sap-ux/fiori-tools/sap-browser-api-warning
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const appUrls = bootstrapConfig?.dataset.openUxPreviewLibsManifests;
    const customInit = bootstrapConfig?.dataset.openUxPreviewCustomInit;
    const flex = bootstrapConfig?.dataset.openUxPreviewFlexSettings;
    const baseUrl = bootstrapConfig?.dataset.openUxPreviewBaseUrl ?? '';

    const urlParams = new URLSearchParams(globalThis.location.search);

    // For ADP, register the variant's changes namespace locally so flex-change resources
    // (fragments, code extensions) resolve against the dev server instead of the backend.
    if (flex) {
        const flexSettings = JSON.parse(flex) as FlexSettings & { projectId?: string };
        if (flexSettings.projectId) {
            registerAdpChangesResourceRoot(flexSettings.projectId, baseUrl);
        }
    }

    if (appUrls) {
        await registerComponentDependencyPaths((JSON.parse(appUrls) as string[]) ?? [], urlParams);
    }

    if (customInit) {
        sap.ui.require([customInit]);
    }
}
