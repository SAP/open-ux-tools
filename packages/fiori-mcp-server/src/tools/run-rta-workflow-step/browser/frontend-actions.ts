import type { FrontendActionResult } from './types.js';

// Pure frontend-action protocol logic — no Playwright, no browser lifecycle.
// Resolving a contract name to its UI5 module, normalizing a raw action result
// into the Flex envelope, and the in-page runner that requires the module and calls the method.

/**
 * The UI5 loader surface on the editor page's `window`. `sap.ui.require` present
 * means UI5 has bootstrapped; its array+callback form (`require([mod], cb, errback)`)
 * loads a module and resolves `cb`.
 */
export interface Ui5LoaderWindow {
    sap?: {
        ui?: {
            require?: (deps: string[], cb: (api: unknown) => void, errback: (err: unknown) => void) => void;
        };
    };
}

/**
 * AMD module paths of the two frontend-action APIs on the running UI5 page.
 *   - Flex RTA actions (`start`, `getOverlaysInformation`, `callAction`, …) live
 *     on `sap/ui/rta/api/FrontendActionsAPI` and return the Flex envelope
 *     `{ isSuccess, payload, error }`.
 *   - Generic Unified Frontend Actions (`describeUI`, `executeAction`, …) live on
 *     `sap/ui/joule/frontend/util/ActionHelpers` and return raw results (a UI tree,
 *     or `{ success, error? }`).
 */
const FLEX_ACTIONS_MODULE = 'sap/ui/rta/api/FrontendActionsAPI';
const UFA_ACTIONS_MODULE = 'sap/ui/joule/frontend/util/ActionHelpers';
/** Prefix (trailing dot included) shared by every Unified Frontend Action contract name. */
export const UFA_PREFIX = 'com.sap.ui.unified.frontend.actions.';
const FLEX_RE = /^com\.sap\.ui\.flex\.(.+)\.v\d+$/;

/**
 * Resolves a frontend-action contract name to the UI5 module that implements it
 * and the bare method to call on that module.
 *
 * `com.sap.ui.flex.startRTA.v1` → `{ module: FrontendActionsAPI, method: 'startRTA', ufa: false }`
 * `com.sap.ui.unified.frontend.actions.describeUI` → `{ module: ActionHelpers, method: 'describeUI', ufa: true }`
 *
 * @param actionName Fully-qualified contract name.
 * @returns The module path, method name, and whether it is a UFA action.
 */
export function resolveAction(actionName: string): { module: string; method: string; ufa: boolean } {
    if (actionName.startsWith(UFA_PREFIX)) {
        return { module: UFA_ACTIONS_MODULE, method: actionName.slice(UFA_PREFIX.length), ufa: true };
    }
    const flex = FLEX_RE.exec(actionName);
    if (flex) {
        return { module: FLEX_ACTIONS_MODULE, method: flex[1], ufa: false };
    }
    // Unknown shape — try it verbatim against the Flex API and let the page report
    // "method not available" rather than guessing a module here.
    return { module: FLEX_ACTIONS_MODULE, method: actionName, ufa: false };
}

/**
 * Normalizes the raw value returned by a frontend-action method into the Flex
 * `{ isSuccess, payload, error }` envelope.
 *
 * Flex actions (`isUfa === false`) already return that envelope, so the raw value
 * is passed through. UFA actions (`ActionHelpers`) return raw results instead: a
 * mutation returns `{ success: boolean, error?/message? }` and a describe returns
 * raw data (e.g. a UI tree). A `{ success: false }` result becomes
 * `{ isSuccess: false, error }` (reason preserved from `error`/`message`); anything
 * else becomes `{ isSuccess: true, payload: <raw> }`.
 *
 * Kept at module scope (rather than inside the browser `evaluate` closure) so it
 * runs in Node and is directly unit-testable.
 *
 * @param raw The value returned by the action method.
 * @param isUfa Whether the action is a UFA action needing normalization.
 * @returns The Flex result envelope.
 */
export function normalizeUfaResult(raw: unknown, isUfa: boolean): FrontendActionResult {
    if (!isUfa) {
        // Flex actions (FrontendActionsAPI) already return the { isSuccess, payload, error }
        // envelope verbatim, so the raw value IS a FrontendActionResult — the cast only
        // restores the type the runtime API already guarantees.
        return raw as FrontendActionResult;
    }
    const r = raw as { success?: boolean; error?: unknown; message?: unknown } | undefined;
    if (r && typeof r === 'object' && r.success === false) {
        const message =
            (typeof r.error === 'string' && r.error) ||
            (typeof r.message === 'string' && r.message) ||
            'UFA action failed';
        return { isSuccess: false, payload: null, error: { code: 'UFA_ACTION_FAILED', message } };
    }
    // A mutation action (e.g. executeAction) returns just a `{ success: true }` status
    // wrapper with no real return value — collapse that to a null payload rather than
    // echoing the wrapper. A describe action returns actual data (e.g. the UI tree),
    // which is kept as the payload.
    const isBareSuccess = r !== undefined && typeof r === 'object' && r.success === true && Object.keys(r).length === 1;
    return { isSuccess: true, payload: isBareSuccess ? null : raw, error: null };
}

/**
 * Requires UI5 module `mod` in the page, calls its `fn` method with `p`, and returns
 * the result as a JSON string. Runs in-browser (Playwright serializes its source), so
 * it reads `window.sap.ui.require` and must stay fully self-contained — it cannot call
 * any module-scope helper, because Playwright ships only this function's own source to
 * the page. It serializes the result in-page (rather than returning the raw object) to
 * dodge Playwright's CDP reference-chain limit on large UI trees. Exported so Node
 * tests can exercise it (including the inlined replacer) by stubbing `window.sap.ui.require`.
 *
 * @param args The module path, method name, and payload.
 * @param args.mod The AMD module path to require.
 * @param args.fn The method name to call on the required module.
 * @param args.p The payload forwarded to the method.
 * @returns The JSON string of the action's raw result.
 */
export async function runActionInPage({
    mod,
    fn,
    p
}: {
    mod: string;
    fn: string;
    p: Record<string, unknown>;
}): Promise<string> {
    const require = (window as unknown as Ui5LoaderWindow).sap?.ui?.require;
    if (!require) {
        throw new Error('sap.ui.require is not available on the page');
    }
    const api = await new Promise<Record<string, unknown>>((resolve, reject) => {
        require([mod], (loaded) => resolve(loaded as Record<string, unknown>), reject);
    });
    const fnImpl = api[fn];
    if (typeof fnImpl !== 'function') {
        throw new TypeError(`Frontend action "${fn}" is not available on ${mod}`);
    }
    const raw = await (fnImpl as (arg: unknown) => unknown).call(api, p);
    // Circular-safe JSON stringify, intentionally inlined: this function is serialized
    // to the browser by Playwright and cannot reference a module-scope helper. The
    // runActionInPage unit tests exercise this replacer (including the cycle case).
    const seen = new WeakSet<object>();
    return JSON.stringify(raw, (_key: string, value: unknown) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    });
}
