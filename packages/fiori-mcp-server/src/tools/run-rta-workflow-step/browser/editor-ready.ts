import { type Page } from 'playwright-core';

// Editor-readiness detection via the control-property-editor's own postMessage
// signal. The adaptation editor shell (top page) hosts the Fiori app in a
// `preview` iframe; when the app and all preview-side services have finished
// initializing, the iframe dispatches an `app-loaded` external action to the
// parent window (see control-property-editor-common `appLoaded` /
// `startPostMessageCommunication`). Awaiting that signal is the deterministic
// equivalent of "the app is fully up", so a following `startRTA` does not race
// a half-booted RuntimeAuthoring.

/** Envelope type used by the editor's postMessage channel. */
const POST_MESSAGE_ACTION_TYPE = 'post-message-action';

/** External action type (note the space) emitted when the preview app is fully loaded. */
const APP_LOADED_ACTION_TYPE = '[ext] app-loaded';

/** Flag the injected listener sets on `window` once the app-loaded signal is seen. */
const APP_LOADED_FLAG = '__sapUxAppLoadedSeen';

/** Argument object passed to {@link appLoadedListenerScript} when injected into the page. */
export interface AppLoadedListenerConfig {
    /** The expected postMessage envelope `type`. */
    envelopeType: string;
    /** The expected external action `type`. */
    actionType: string;
    /** The `window` property name the listener flips to `true` on the signal. */
    flag: string;
}

/**
 * The browser-side listener body, as a self-contained function.
 *
 * This runs in the page, not in Node: {@link installAppLoadedListener} hands it to
 * Playwright's `addInitScript`, which serializes it with `.toString()` and re-parses
 * it in the browser. It therefore MUST NOT reference anything from module scope
 * (imports, top-level consts, other functions) — every input arrives via its single
 * `config` argument, and it uses only browser globals (`window`). It is a named
 * top-level function (not an inline closure) purely so it can be invoked directly
 * from unit tests against a fake `window`.
 *
 * On the top window it seeds `window[flag] = false`, then on every `message` event
 * rejects cross-origin senders first — so a frame from another origin can never spoof
 * the app-loaded flag — and flips `window[flag] = true` on a same-origin message whose
 * envelope and action type match.
 *
 * @param config Envelope/action types to match and the flag property to set.
 */
export function appLoadedListenerScript(config: AppLoadedListenerConfig): void {
    const { envelopeType, actionType, flag } = config;
    // Only install on the top window (the editor shell receives the message).
    if (window.parent !== window) {
        return;
    }
    (window as unknown as Record<string, unknown>)[flag] = false;
    window.addEventListener('message', (event: MessageEvent) => {
        // Reject cross-origin senders first, so a frame from another origin cannot spoof the app-loaded flag.
        if (event.origin !== window.location.origin) {
            return;
        }
        const data = event.data as { type?: string; action?: { type?: string } } | undefined;
        if (data?.type === envelopeType && data.action?.type === actionType) {
            (window as unknown as Record<string, unknown>)[flag] = true;
        }
    });
}

/**
 * Installs a `message` listener on the page that flips {@link APP_LOADED_FLAG}
 * to `true` when the preview iframe posts its `app-loaded` action to the parent.
 * Uses `addInitScript`, so the listener is present on the top page before any
 * navigation or message — a signal fired during boot is never missed. Safe to
 * call once per page, before `page.goto`.
 *
 * @param page The editor page to instrument.
 */
export async function installAppLoadedListener(page: Page): Promise<void> {
    await page.addInitScript(appLoadedListenerScript, {
        envelopeType: POST_MESSAGE_ACTION_TYPE,
        actionType: APP_LOADED_ACTION_TYPE,
        flag: APP_LOADED_FLAG
    });
}

/**
 * Waits until the editor's `app-loaded` signal has been observed (the listener
 * from {@link installAppLoadedListener} set its flag), up to `budgetMs`. Resolves
 * `true` when seen, `false` on timeout — never throws.
 *
 * @param page The instrumented editor page.
 * @param budgetMs Maximum time to wait for the signal.
 * @returns `true` if the app-loaded signal arrived within the budget, else `false`.
 */
export async function waitForAppLoaded(page: Page, budgetMs: number): Promise<boolean> {
    try {
        await page.waitForFunction(
            (flag) => (window as unknown as Record<string, unknown>)[flag] === true,
            APP_LOADED_FLAG,
            { timeout: budgetMs }
        );
        return true;
    } catch {
        return false;
    }
}
