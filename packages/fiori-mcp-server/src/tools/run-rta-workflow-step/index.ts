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
import { defaultTransport, isRegistryEmpty } from './browser/index.js';
import { STEPS, type RunRtaWorkflowStepInput, type RunRtaWorkflowStepResult } from './types.js';

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

/**
 * Asserts that `site` is a non-empty string. Used by every step except `start`
 * to validate that the caller carried the site URL forward from the `start` result.
 *
 * @param site Value of `input.site`.
 * @returns The validated site URL.
 */
function requireSite(site: string | undefined): string {
    if (typeof site !== 'string' || site.length === 0) {
        throw new Error('site is required for this step. Pass the site URL returned by the "start" step.');
    }
    return site;
}

/**
 * Runs one step of the RTA workflow. Dispatches by `input.step` and forwards
 * to the corresponding `rta` command wrapper. `site` and `frameId` are passed
 * directly on every call — the tool holds no server-side session state.
 * `connectionRegistry` inside `playwright-bridge` caches the live Playwright
 * page by URL and is the only long-lived state, scoped to the browser process.
 *
 * @param input Step + site + frameId + step-specific payload.
 * @returns Step-specific result. The `start` step echoes `site` and `frameId` back.
 */
export async function runRtaWorkflowStep(input: RunRtaWorkflowStepInput): Promise<RunRtaWorkflowStepResult> {
    try {
        switch (input.step) {
            case 'start': {
                const site = requireString(input.payload, 'site');
                const frameId = typeof input.payload?.frameId === 'string' ? input.payload.frameId : undefined;
                // Always disconnect any existing page for this URL before starting fresh.
                // This prevents a new project opened on the same port from reusing the
                // previous project's stale Playwright page.
                await defaultTransport.disconnectSite(site);
                const result = await startRta(defaultTransport, { site, frameId });
                return { site, frameId, ...result };
            }
            case 'get_overlays': {
                const site = requireSite(input.site);
                const { overlays, actionsCatalog } = await getOverlays(defaultTransport, { site, frameId: input.frameId });
                return { overlays, actionsCatalog };
            }
            case 'get_context': {
                const site = requireSite(input.site);
                const controlId = requireString(input.payload, 'controlId');
                const actionId = requireString(input.payload, 'actionId');
                const context = await getElementContext(defaultTransport, { site, frameId: input.frameId }, controlId, actionId);
                return { context };
            }
            case 'call_action': {
                const site = requireSite(input.site);
                const controlId = requireString(input.payload, 'controlId');
                const actionId = requireString(input.payload, 'actionId');
                const actionPayload = requireObject(input.payload, 'actionPayload');
                const ok = await executeAction(defaultTransport, { site, frameId: input.frameId }, controlId, actionId, actionPayload);
                return { success: ok };
            }
            case 'save': {
                const site = requireSite(input.site);
                const ok = await saveChanges(defaultTransport, { site, frameId: input.frameId });
                return { saved: ok };
            }
            case 'stop': {
                const site = requireSite(input.site);
                await defaultTransport.disconnectSite(site);
                if (isRegistryEmpty()) {
                    await defaultTransport.stopBrowser();
                }
                return { stopped: true };
            }
            case 'restart': {
                const site = requireSite(input.site);
                const page = { site, frameId: input.frameId };
                await defaultTransport.disconnectSite(site);
                const result = await startRta(defaultTransport, page);
                return { site, frameId: input.frameId, ...result };
            }
            case 'get_page_actions': {
                const site = requireSite(input.site);
                const { registered, interactive, interactiveTruncated } = await getPageActions(
                    defaultTransport,
                    { site, frameId: input.frameId }
                );
                return {
                    registered,
                    interactive,
                    ...(interactiveTruncated && { interactiveTruncated })
                };
            }
            case 'call_page_action': {
                const site = requireSite(input.site);
                const id = requireString(input.payload, 'id');
                const result = await callPageAction(defaultTransport, { site, frameId: input.frameId }, id);
                return { result };
            }
            case 'press_interactive': {
                const site = requireSite(input.site);
                const controlId = requireString(input.payload, 'controlId');
                const result = await pressInteractive(defaultTransport, { site, frameId: input.frameId }, controlId);
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
