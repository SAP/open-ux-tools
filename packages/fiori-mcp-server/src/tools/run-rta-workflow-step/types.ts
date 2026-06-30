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
    'get_page_actions',
    'call_page_action',
    'press_interactive'
] as const;

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
 * Per-step result shapes. The dispatcher returns the union; each `case`
 * inside the switch returns the matching shape, so the compiler verifies
 * each branch produces something assignable to its slot.
 */
export interface StartStepResult {
    sessionId: string;
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
    | GetPageActionsStepResult
    | CallPageActionStepResult
    | PressInteractiveStepResult;
