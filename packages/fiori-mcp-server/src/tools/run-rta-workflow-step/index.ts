import { randomUUID } from 'node:crypto';
import {
    executeAction,
    FrontendActionError,
    getActions,
    getElementContext,
    getOverlays,
    saveChanges,
    startRta,
    stopBrowser
} from './frontend-actions';
import { logger } from '../../utils/logger';

/**
 * Per-session coordinates. Persisted in-process for the lifetime of the
 * fiori-mcp server so successive `run_rta_workflow_step` calls can share
 * one browser page without the caller passing the URL on every step.
 */
interface RtaSession {
    site: string;
    frameId?: string;
}

const sessions: Map<string, RtaSession> = new Map();

/**
 * Allowed step values. Mirrors the Joule frontend action surface.
 */
const STEPS = ['start', 'get_overlays', 'get_actions', 'get_context', 'call_action', 'save', 'stop'] as const;
type Step = (typeof STEPS)[number];

/**
 * Input shape accepted by `run_rta_workflow_step`. The `payload` object
 * carries step-specific data so the tool surface stays tidy.
 */
export interface RunRtaWorkflowStepInput {
    step: Step;
    sessionId?: string;
    payload?: Record<string, unknown>;
}

/**
 * Result returned by the tool. The shape varies by step; the union is
 * widened here to keep the dispatcher's return type honest.
 */
export type RunRtaWorkflowStepResult = Record<string, unknown>;

function getSession(sessionId: string | undefined): { id: string; session: RtaSession } {
    if (!sessionId) {
        throw new Error('sessionId is required for this step');
    }
    const session = sessions.get(sessionId);
    if (!session) {
        throw new Error(`Unknown sessionId: ${sessionId}. Call the "start" step first.`);
    }
    return { id: sessionId, session };
}

function requireString(payload: Record<string, unknown> | undefined, key: string): string {
    const value = payload?.[key];
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`payload.${key} is required and must be a non-empty string`);
    }
    return value;
}

function requireObject(payload: Record<string, unknown> | undefined, key: string): Record<string, unknown> {
    const value = payload?.[key];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`payload.${key} is required and must be an object`);
    }
    return value as Record<string, unknown>;
}

/**
 * Internal step dispatcher that runs one operation in the RTA workflow on
 * behalf of the `adp-rta-workflow` skill. **Do not call this tool directly
 * from a chat session**; the skill orchestrates the step sequence and
 * decides what to feed each invocation. Calling out of order will fail
 * with descriptive errors but skips the AI decision points the skill
 * provides.
 *
 * @param input Step + sessionId + step-specific payload.
 * @returns Step-specific result. The `start` step returns the session id.
 */
export async function runRtaWorkflowStep(input: RunRtaWorkflowStepInput): Promise<RunRtaWorkflowStepResult> {
    if (!STEPS.includes(input.step)) {
        throw new Error(`Unknown step: ${input.step}. Valid steps: ${STEPS.join(', ')}`);
    }

    try {
        switch (input.step) {
            case 'start': {
                const site = requireString(input.payload, 'site');
                const frameId =
                    typeof input.payload?.frameId === 'string' ? (input.payload.frameId as string) : undefined;
                const result = await startRta({ site, frameId });
                const sessionId = randomUUID();
                sessions.set(sessionId, { site, frameId });
                return { sessionId, ...result };
            }
            case 'get_overlays': {
                const { session } = getSession(input.sessionId);
                const overlays = await getOverlays(session);
                return { overlays };
            }
            case 'get_actions': {
                const { session } = getSession(input.sessionId);
                const controlId = requireString(input.payload, 'controlId');
                const actions = await getActions(session, controlId);
                return { actions };
            }
            case 'get_context': {
                const { session } = getSession(input.sessionId);
                const controlId = requireString(input.payload, 'controlId');
                const actionId = requireString(input.payload, 'actionId');
                const context = await getElementContext(session, controlId, actionId);
                return { context };
            }
            case 'call_action': {
                const { session } = getSession(input.sessionId);
                const controlId = requireString(input.payload, 'controlId');
                const actionId = requireString(input.payload, 'actionId');
                const actionPayload = requireObject(input.payload, 'actionPayload');
                const ok = await executeAction(session, controlId, actionId, actionPayload);
                return { success: ok };
            }
            case 'save': {
                const { session } = getSession(input.sessionId);
                const ok = await saveChanges(session);
                return { saved: ok };
            }
            case 'stop': {
                const { id } = getSession(input.sessionId);
                sessions.delete(id);
                if (sessions.size === 0) {
                    await stopBrowser();
                }
                return { stopped: true };
            }
            default: {
                // Exhaustiveness check — the STEPS array constrains `input.step`.
                const exhaustive: never = input.step;
                throw new Error(`Unhandled step: ${String(exhaustive)}`);
            }
        }
    } catch (error) {
        if (error instanceof FrontendActionError) {
            logger.warn(`Frontend action failed in step ${input.step}: ${error.message}`);
        }
        throw error;
    }
}
