import { randomUUID } from 'node:crypto';
import { stopBrowser } from './browser';
import {
    executeAction,
    FrontendActionError,
    getActions,
    getElementContext,
    getOverlays,
    saveChanges,
    startRta
} from './rta';
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
 * The seven steps run_rta_workflow_step accepts. Single source of truth —
 * the Zod schema in `types/input.ts` derives its enum from this tuple, so
 * adding a step here is the only place that needs to change.
 */
export const STEPS = ['start', 'get_overlays', 'get_actions', 'get_context', 'call_action', 'save', 'stop'] as const;
export type Step = (typeof STEPS)[number];

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
 * Runs one step of the RTA workflow. The MCP tool description (in
 * `tools/index.ts`) carries the AI-facing guidance about step ordering and
 * the skill-internal contract; this docblock stays purely technical.
 *
 * Dispatches by `input.step`, looks up or creates a session, and forwards
 * to the corresponding `rta` command wrapper. Each step's return shape
 * matches the schema description in `types/input.ts`.
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
                const frameId = typeof input.payload?.frameId === 'string' ? input.payload.frameId : undefined;
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
