import { type Page } from 'playwright-core';

// Editor-readiness detection via the control-property-editor's `app-loaded`
// postMessage signal. The editor shell hosts the app in a `preview` iframe; once
// the app and its preview-side services finish booting, the iframe posts an
// `app-loaded` action to the parent. Awaiting it means a following `startRTA`
// does not race a half-booted RuntimeAuthoring.

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
 * Runs in the page, not Node: {@link installAppLoadedListener} passes it to
 * `addInitScript`, which serializes it with `.toString()`. It therefore MUST NOT
 * reference module scope — every input arrives via `config` and it uses only
 * browser globals. It is top-level (not an inline closure) so unit tests can call
 * it against a fake `window`.
 *
 * Installs only on the top window: seeds `window[flag] = false`, then flips it to
 * `true` on a same-origin message whose envelope and action type match (cross-origin
 * senders are rejected first, so another origin cannot spoof the flag).
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
 * Installs a `message` listener that flips {@link APP_LOADED_FLAG} to `true` when
 * the preview iframe posts its `app-loaded` action. Uses `addInitScript` so the
 * listener is present before any navigation — a signal fired during boot is never
 * missed. Call once per page, before `page.goto`.
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
