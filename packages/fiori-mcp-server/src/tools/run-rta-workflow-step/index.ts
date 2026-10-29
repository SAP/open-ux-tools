import {
    callPageAction,
    executeAction,
    FrontendActionError,
    getElementContext,
    getOverlays,
    getPageActions,
    pressInteractive,
    saveChanges,
    startRta
} from './rta/index.js';
import { logger } from '../../utils/logger.js';
import { defaultTransport, httpTransport, isRegistryEmpty } from './browser/index.js';
import { STEPS, type RunRtaWorkflowStepInput, type RunRtaWorkflowStepResult } from './types.js';
import { requireEditorSession } from '../../utils/editor-session.js';
import { isSimpleBrowserRelayEnabled } from '../../utils/simple-browser-relay.js';

// Simple Browser HTTP relay when enabled (BAS / FORCE_AUTOOPEN), else Playwright.
const activeTransport = isSimpleBrowserRelayEnabled() ? httpTransport : defaultTransport;

/**
 * Reads `key` from `payload` and asserts it is a non-empty string. The Zod
 * schema declares `payload` as `record(string, unknown)` so the AI can pass
 * any shape; per-step required fields are validated here instead.
 *
 * @param payload The step payload, possibly undefined.
 * @param key Property name to read.
 * @returns The string value.
 */
function requireString(payload: Record<string, unknown> | undefined, key: string): string {
    const value = payload?.[key];
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`payload.${key} is required and must be a non-empty string`);
    }
    return value;
}

/**
 * Reads `key` from `payload` and asserts it is a plain object.
 *
 * @param payload The step payload, possibly undefined.
 * @param key Property name to read.
 * @returns The object value.
 */
function requireObject(payload: Record<string, unknown> | undefined, key: string): Record<string, unknown> {
    const value = payload?.[key];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`payload.${key} is required and must be an object`);
    }
    return value as Record<string, unknown>;
}

/** Loopback hostnames the editor binds to in local Playwright runs. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Requires an exact owned editor URL for HTTP relay, or loopback for browser transports.
 *
 * @param site Value of `input.site`.
 * @returns The validated site URL.
 */
function requireSite(site: string | undefined): string {
    if (typeof site !== 'string' || site.length === 0) {
        throw new Error('site is required for this step. Pass the site URL returned by the "start" step.');
    }
    let url: URL;
    try {
        url = new URL(site);
    } catch {
        throw new Error(`site must be a valid URL. Received: "${site}"`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`site must be an http:// or https:// URL. Received: "${site}"`);
    }

    if (activeTransport === httpTransport) {
        requireEditorSession(site);
        return site;
    }
    const hostname = url.hostname.toLowerCase();
    if (LOOPBACK_HOSTS.has(hostname)) {
        return site;
    }

    throw new Error(`site must point to localhost or 127.0.0.1. Received: "${url.hostname}"`);
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
                // Reload the editor page so it re-reads the on-disk webapp/changes
                // (new fragment / controller files). The HTTP relay asks the editor
                // page to reload itself. Transports without a reload capability fall
                // back to just re-invoking startRTA in the already-loaded page.
                if (activeTransport.reloadPage) {
                    await activeTransport.reloadPage(site);
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
