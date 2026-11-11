import {
    cleanup,
    describeUi,
    executeAction,
    executeUfaAction,
    FrontendActionError,
    getElementContext,
    getODataMetadata,
    getOverlays,
    saveChanges,
    startRta
} from './rta/index.js';
import { logger } from '../../utils/logger.js';
import { defaultTransport, httpTransport, isRegistryEmpty, registerSite } from './browser/index.js';
import { STEPS, type RunRtaWorkflowStepInput, type RunRtaWorkflowStepResult } from './types.js';
import {
    optionalObject,
    optionalString,
    requireAppPath,
    requireObject,
    requireSite as requireLoopbackSite,
    requireString,
    requireStringArray
} from './assertions.js';
import { requireEditorSession } from '../../utils/editor-session.js';
import { isSimpleBrowserRelayEnabled } from '../../utils/simple-browser-relay.js';

// Simple Browser HTTP relay when enabled (BAS / FORCE_AUTOOPEN), else Playwright.
const activeTransport = isSimpleBrowserRelayEnabled() ? httpTransport : defaultTransport;

/**
 * Validates the site URL. Over the HTTP relay the exact owned editor URL must be a
 * registered editor session; browser transports use the shared loopback validation.
 *
 * @param site Value of `input.site`.
 * @returns The validated site URL.
 */
function requireSite(site: string | undefined): string {
    if (activeTransport === httpTransport) {
        if (typeof site !== 'string' || site.length === 0) {
            throw new Error('site is required for this step. Pass the site URL returned by the "start" step.');
        }
        requireEditorSession(site);
        return site;
    }
    return requireLoopbackSite(site);
}

/**
 * Runs one step of the RTA workflow. Dispatches by `input.step` and forwards
 * to the corresponding `rta` command wrapper. `site` and `frameId` are passed
 * directly on every call. HTTP relay lifecycle and credentials belong to the
 * editor-session registry; browser transports retain their own connections.
 *
 * @param input Step + site + frameId + step-specific payload.
 * @returns Step-specific result. The `start` step echoes `site` and `frameId` back.
 */
export async function runRtaWorkflowStep(input: RunRtaWorkflowStepInput): Promise<RunRtaWorkflowStepResult> {
    try {
        const site = requireSite(input.site);
        const frameId = input.frameId ?? 'preview';
        switch (input.step) {
            case 'start': {
                const agentName = optionalString(input.payload, 'agentName');
                if (activeTransport === httpTransport) {
                    // The relay carries its own editor-session and its `start` is not given an
                    // appPath, so skip the Playwright project seeding entirely.
                    await activeTransport.disconnectSite(site);
                } else {
                    // Validate required input BEFORE disconnecting: a bad appPath must not
                    // tear down an existing working page for a call that then throws.
                    const appPath = requireAppPath(input.appPath);
                    await activeTransport.disconnectSite(site);
                    // Record which project (and whether CF) is starting on this site, so
                    // session seeding is keyed by project and ABAP projects skip it entirely.
                    await registerSite(site, appPath);
                }
                const result = await startRta(activeTransport, { site, frameId }, agentName);
                return { site, frameId, ...result };
            }
            case 'get_overlays': {
                const { overlays, actionsCatalog } = await getOverlays(activeTransport, {
                    site,
                    frameId
                });
                return { overlays, actionsCatalog };
            }
            case 'get_context': {
                const controlId = requireString(input.payload, 'controlId');
                const actionId = requireString(input.payload, 'actionId');
                const context = await getElementContext(activeTransport, { site, frameId }, controlId, actionId);
                return { context };
            }
            case 'call_action': {
                const controlId = requireString(input.payload, 'controlId');
                const actionId = requireString(input.payload, 'actionId');
                const actionPayload = requireObject(input.payload, 'actionPayload');
                const ok = await executeAction(activeTransport, { site, frameId }, controlId, actionId, actionPayload);
                return { success: ok };
            }
            case 'save': {
                const ok = await saveChanges(activeTransport, { site, frameId });
                return { saved: ok };
            }
            case 'cleanup': {
                const reason = optionalString(input.payload, 'reason');
                const { cleaned } = await cleanup(activeTransport, { site, frameId }, reason);
                return { cleaned };
            }
            case 'stop': {
                await activeTransport.disconnectSite(site);
                // The relay session owns both the automatic tab signal and server handle.
                if (activeTransport.stopEditor) {
                    const editorServerStopped = await activeTransport.stopEditor(site);
                    return { stopped: true, editorServerStopped };
                }
                // Transports that own the browser close it directly.
                if (activeTransport !== httpTransport && isRegistryEmpty()) {
                    await activeTransport.stopBrowser();
                }
                return { stopped: true };
            }
            case 'restart': {
                const page = { site, frameId };
                if (activeTransport === httpTransport) {
                    await activeTransport.disconnectSite(site);
                    // Relay: ask the editor page to reload so it re-reads the on-disk
                    // webapp/changes (new fragment / controller files).
                    if (activeTransport.reloadPage) {
                        await activeTransport.reloadPage(site);
                    }
                } else {
                    // Validate required input BEFORE disconnecting: a bad appPath must not
                    // tear down the running editor page for a call that then throws.
                    const appPath = requireAppPath(input.appPath);
                    await activeTransport.disconnectSite(site);
                    // disconnectSite forgot the site meta; re-register so the reloaded
                    // editor keeps its project identity / CF session keying.
                    await registerSite(site, appPath);
                }
                const result = await startRta(activeTransport, page);
                return { site, frameId, ...result };
            }
            case 'describe_ui': {
                const rootElementId = optionalString(input.payload, 'rootElementId');
                const uiTree = await describeUi(activeTransport, { site, frameId }, rootElementId);
                return { uiTree };
            }
            case 'execute_page_action': {
                const actionName = requireString(input.payload, 'actionName');
                const elementId = optionalString(input.payload, 'elementId');
                const actionParameters = optionalObject(input.payload, 'actionParameters');
                const ufaResult = await executeUfaAction(
                    activeTransport,
                    { site, frameId },
                    actionName,
                    elementId,
                    actionParameters
                );
                return { isSuccess: ufaResult.isSuccess, result: ufaResult.result };
            }
            case 'get_odata_metadata': {
                const uris = requireStringArray(input.payload, 'uris');
                const appPath = requireAppPath(input.appPath);
                return getODataMetadata(activeTransport, site, uris, appPath);
            }
            default:
                throw new Error(`Unknown step: ${String(input.step)}. Valid steps: ${STEPS.join(', ')}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof FrontendActionError) {
            logger.warn(`Frontend action failed in step ${input.step}: ${message}`);
        } else {
            logger.error(`run_rta_workflow_step "${input.step}" failed: ${message}`);
        }
        throw error;
    }
}
