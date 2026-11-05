import {
    callPageAction,
    executeAction,
    FrontendActionError,
    getElementContext,
    getODataMetadata,
    getOverlays,
    getPageActions,
    pressInteractive,
    saveChanges,
    startRta
} from './rta/index.js';
import { logger } from '../../utils/logger.js';
import { defaultTransport, httpTransport, isRegistryEmpty, registerSite } from './browser/index.js';
import { STEPS, type RunRtaWorkflowStepInput, type RunRtaWorkflowStepResult } from './types.js';
import {
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
                // Always disconnect any existing page for this URL before starting fresh.
                // This prevents a new project opened on the same port from reusing the previous project's stale Playwright page.
                await activeTransport.disconnectSite(site);
                // Playwright seeds its session keyed by project (and whether CF); the relay
                // carries its own editor-session, so skip registerSite when the relay is active
                // (the relay `start` is not given an appPath).
                if (activeTransport !== httpTransport) {
                    const appPath = requireAppPath(input.appPath);
                    await registerSite(site, appPath);
                }
                const result = await startRta(activeTransport, { site, frameId });
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
                await activeTransport.disconnectSite(site);
                if (activeTransport === httpTransport) {
                    // Relay: ask the editor page to reload so it re-reads the on-disk
                    // webapp/changes (new fragment / controller files).
                    if (activeTransport.reloadPage) {
                        await activeTransport.reloadPage(site);
                    }
                } else {
                    // Playwright: disconnectSite forgot the site meta; re-register so the
                    // reloaded editor keeps its project identity / CF session keying.
                    const appPath = requireAppPath(input.appPath);
                    await registerSite(site, appPath);
                }
                const result = await startRta(activeTransport, page);
                return { site, frameId, ...result };
            }
            case 'get_page_actions': {
                const { registered, interactive, interactiveTruncated } = await getPageActions(activeTransport, {
                    site,
                    frameId
                });
                return {
                    registered,
                    interactive,
                    ...(interactiveTruncated && { interactiveTruncated })
                };
            }
            case 'call_page_action': {
                const id = requireString(input.payload, 'id');
                const result = await callPageAction(activeTransport, { site, frameId }, id);
                return { result };
            }
            case 'press_interactive': {
                const controlId = requireString(input.payload, 'controlId');
                const result = await pressInteractive(activeTransport, { site, frameId }, controlId);
                return { result };
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
