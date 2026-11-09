import type {
    ActionsCatalog,
    DescribeUiResult,
    ElementContext,
    ExecuteUfaActionResult,
    GetODataMetadataResult,
    Overlay
} from './rta/types.js';

/**
 * The steps run_rta_workflow_step accepts. Single source of truth — the
 * Zod schema in `types/input.ts` derives its enum from this tuple, so
 * adding a step here is the only place that needs to change.
 */
export const STEPS = [
    'start',
    'get_overlays',
    'get_context',
    'call_action',
    'save',
    'stop',
    'restart',
    'describe_ui',
    'execute_page_action',
    'get_odata_metadata'
] as const;

export type Step = (typeof STEPS)[number];

/**
 * Input shape accepted by `run_rta_workflow_step`. `site` and `frameId` are
 * returned by `start` and must be passed to every subsequent step so the
 * dispatcher can locate the browser page without maintaining a server-side
 * session map.
 */
export interface RunRtaWorkflowStepInput {
    step: Step;
    /** Editor URL from the open_adaptation_editor result. Required for every step. */
    site: string;
    /** Optional iframe element id (e.g. `"preview"`). Required when the editor renders inside an iframe. */
    frameId?: string;
    /**
     * Adaptation project root. Required for `start`/`restart` (project identity +
     * CF session keying); optional for `get_odata_metadata` (large-metadata spill);
     * ignored by other steps.
     */
    appPath?: string;
    payload?: Record<string, unknown>;
}

/**
 * Per-step result shapes. The dispatcher returns the union; each `case`
 * inside the switch returns the matching shape, so the compiler verifies
 * each branch produces something assignable to its slot.
 */
export interface StartStepResult {
    /** Echo of the editor URL — carry this forward to every subsequent step. */
    site: string;
    /** Echo of the frameId — carry this forward to every subsequent step. */
    frameId: string;
    rtaStarted: boolean;
    /** Set when the editor URL served a backend login page instead of the app. */
    needsUserAction?: 'backend_login_required';
    /** Human-readable guidance accompanying `needsUserAction`. */
    message?: string;
}

export interface GetOverlaysStepResult {
    overlays: Overlay[];
    actionsCatalog: ActionsCatalog;
}

export interface GetContextStepResult {
    context: ElementContext;
}

export interface CallActionStepResult {
    success: boolean;
}

export interface SaveStepResult {
    saved: boolean;
}

export interface StopStepResult {
    stopped: true;
    /**
     * Whether the editor server process was killed (HTTP relay transport only,
     * where `stop` derives the port from `site` and kills the detached editor).
     * Omitted for transports that own the browser/process lifecycle directly.
     */
    editorServerStopped?: boolean;
}

export interface RestartStepResult {
    site: string;
    frameId: string;
    rtaStarted: boolean;
    /** Set when the editor URL served a backend login page instead of the app. */
    needsUserAction?: 'backend_login_required';
    /** Human-readable guidance accompanying `needsUserAction`. */
    message?: string;
}

export interface DescribeUiStepResult {
    uiTree: DescribeUiResult;
}

export interface ExecutePageActionStepResult {
    isSuccess: boolean;
    result?: ExecuteUfaActionResult['result'];
}

/**
 * Result of the `get_odata_metadata` step: one entry per requested OData URI,
 * each carrying formatted EDMX or a per-entry error.
 */
export type GetODataMetadataStepResult = GetODataMetadataResult;

export type RunRtaWorkflowStepResult =
    | StartStepResult
    | GetOverlaysStepResult
    | GetContextStepResult
    | CallActionStepResult
    | SaveStepResult
    | StopStepResult
    | RestartStepResult
    | DescribeUiStepResult
    | ExecutePageActionStepResult
    | GetODataMetadataStepResult;
