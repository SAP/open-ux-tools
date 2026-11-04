import {
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
import { defaultTransport, isRegistryEmpty, registerSite } from './browser/index.js';
import { STEPS, type RunRtaWorkflowStepInput, type RunRtaWorkflowStepResult } from './types.js';
import { requireAppPath, requireObject, requireSite, requireString, requireStringArray } from './assertions.js';

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
        const site = requireSite(input.site);
        const frameId = input.frameId ?? 'preview';
        switch (input.step) {
            case 'start': {
                // Always disconnect any existing page for this URL before starting fresh.
                // This prevents a new project opened on the same port from reusing the previous project's stale Playwright page.
                await defaultTransport.disconnectSite(site);
                // Record which project (and whether CF) is starting on this site, so
                // session seeding is keyed by project and ABAP projects skip it entirely.
                const appPath = requireAppPath(input.appPath);
                await registerSite(site, appPath);
                const result = await startRta(defaultTransport, { site, frameId });
                return { site, frameId, ...result };
            }
            case 'get_overlays': {
                const { overlays, actionsCatalog } = await getOverlays(defaultTransport, {
                    site,
                    frameId
                });
                return { overlays, actionsCatalog };
            }
            case 'get_context': {
                const controlId = requireString(input.payload, 'controlId');
                const actionId = requireString(input.payload, 'actionId');
                const context = await getElementContext(defaultTransport, { site, frameId }, controlId, actionId);
                return { context };
            }
            case 'call_action': {
                const controlId = requireString(input.payload, 'controlId');
                const actionId = requireString(input.payload, 'actionId');
                const actionPayload = requireObject(input.payload, 'actionPayload');
                const ok = await executeAction(defaultTransport, { site, frameId }, controlId, actionId, actionPayload);
                return { success: ok };
            }
            case 'save': {
                const ok = await saveChanges(defaultTransport, { site, frameId });
                return { saved: ok };
            }
            case 'stop': {
                await defaultTransport.disconnectSite(site);
                if (isRegistryEmpty()) {
                    await defaultTransport.stopBrowser();
                }
                return { stopped: true };
            }
            case 'restart': {
                const page = { site, frameId };
                await defaultTransport.disconnectSite(site);
                // disconnectSite forgot the site meta; re-register so the reloaded
                // editor keeps its project identity / CF session keying.
                const appPath = requireAppPath(input.appPath);
                await registerSite(site, appPath);
                const result = await startRta(defaultTransport, page);
                return { site, frameId, ...result };
            }
            case 'describe_ui': {
                const rawRootId = input.payload?.['rootElementId'];
                const rootElementId = rawRootId !== undefined ? String(rawRootId) : undefined;
                const uiTree = await describeUi(defaultTransport, { site, frameId }, rootElementId);
                return { uiTree };
            }
            case 'execute_page_action': {
                const actionName = requireString(input.payload, 'actionName');
                const rawElemId = input.payload?.['elementId'];
                const elementId = rawElemId !== undefined ? String(rawElemId) : undefined;
                const rawParams = input.payload?.['actionParameters'];
                // actionParameters is optional, but when present it must be a plain object.
                // Reject anything else (array, primitive) rather than silently dropping it,
                // so a malformed call surfaces an error instead of succeeding with its
                // parameters quietly discarded.
                if (
                    rawParams !== undefined &&
                    (typeof rawParams !== 'object' || rawParams === null || Array.isArray(rawParams))
                ) {
                    throw new Error('payload.actionParameters must be an object when provided');
                }
                const actionParameters = rawParams as Record<string, unknown> | undefined;
                const ufaResult = await executeUfaAction(
                    defaultTransport,
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
                return getODataMetadata(defaultTransport, site, uris, appPath);
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
