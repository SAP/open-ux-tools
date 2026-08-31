import type {
    ActionsCatalog,
    ElementContext,
    InteractiveElement,
    Overlay,
    PageActionRunResult,
    RegisteredPageAction
} from './rta/types.js';

/**
 * The steps run_rta_workflow_step accepts. Single source of truth — the
 * Zod schema in `types/input.ts` derives its enum from this tuple, so
 * adding a step here is the only place that needs to change.
 *
 * The original six steps drive the RTA workflow itself; the last three
 * (`get_page_actions`, `call_page_action`, `press_interactive`) drive
 * pre-RTA navigation via the FrontendActionRegistry on the page.
 *
 * Action lists per control are no longer exposed as a standalone step —
 * the editor page returns them inline via `get_overlays` (`actionsCatalog`
 * + each overlay's `actionIds`).
 */
export const STEPS = [
    'start',
    'get_overlays',
    'get_context',
    'call_action',
    'save',
    'stop',
    'restart',
    'get_page_actions',
    'call_page_action',
    'press_interactive'
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
    /** Echo of the frameId — carry this forward when set. */
    frameId?: string;
    rtaStarted: boolean;
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
}

export interface RestartStepResult {
    site: string;
    frameId?: string;
    rtaStarted: boolean;
}

export interface GetPageActionsStepResult {
    registered: RegisteredPageAction[];
    interactive: InteractiveElement[];
    /** Set to `true` when the interactive scan hit its internal cap. */
    interactiveTruncated?: true;
}

export interface CallPageActionStepResult {
    result: PageActionRunResult;
}

export interface PressInteractiveStepResult {
    result: PageActionRunResult;
}

export type RunRtaWorkflowStepResult =
    | StartStepResult
    | GetOverlaysStepResult
    | GetContextStepResult
    | CallActionStepResult
    | SaveStepResult
    | StopStepResult
    | RestartStepResult
    | GetPageActionsStepResult
    | CallPageActionStepResult
    | PressInteractiveStepResult;
