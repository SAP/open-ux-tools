(function () {
    'use strict';

    const REQUEST_TIMEOUT_MS = 30000;
    const FETCH_TIMEOUT_MS = 30000;
    const ACTION_DEADLINE_MS = 55000;
    const API_POLL_INTERVAL_MS = 200;
    const RTA_POLL_INTERVAL_MS = 250;
    const RETRY_DELAY_MS = 1000;
    const MAX_RETRY_DELAY_MS = 5000;
    const POLL_RECOVERY_MS = 90000;
    const RESULT_RECOVERY_MS = 30000;
    const STOP_RESULT_RECOVERY_MS = 2000;
    const APP_LOADED_POLL_INTERVAL_MS = 200;
    const POST_MESSAGE_ACTION_ENVELOPE_TYPE = 'post-message-action';
    const APP_LOADED_ACTION_TYPE = '[ext] app-loaded';
    const RELOAD_ACTION_TYPE = '[ext] reload-application';

    // Frontend-action modules, mirrored from the Playwright transport's frontend-actions.ts.
    const FLEX_ACTIONS_MODULE = 'sap/ui/rta/api/FrontendActionsAPI';
    const UFA_ACTIONS_MODULE = 'sap/ui/joule/frontend/util/ActionHelpers';
    const UFA_PREFIX = 'com.sap.ui.unified.frontend.actions.';

    // Capture currentScript before any await. Deriving endpoints from its URL preserves mount prefixes.
    const script = document.currentScript;
    const token = script.dataset.token;
    const base = new URL('.', script.src);
    const clientId = crypto.randomUUID();
    let activeAction;
    let stopped = false;

    let appLoadedSeen = false;
    let appLoadedListening = false;
    if (window.self === window.top) {
        appLoadedListening = true;
        window.addEventListener('message', (event) => {
            if (event.origin !== location.origin) {
                return;
            }
            const data = event.data;
            if (
                data &&
                data.type === POST_MESSAGE_ACTION_ENVELOPE_TYPE &&
                data.action &&
                data.action.type === APP_LOADED_ACTION_TYPE
            ) {
                appLoadedSeen = true;
            }
        });
    }

    function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function request(endpoint, body, timeoutMs = REQUEST_TIMEOUT_MS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(new URL(endpoint, base), {
                method: body === undefined ? 'GET' : 'POST',
                headers: { 'X-Relay-Token': token, 'Content-Type': 'application/json' },
                body,
                cache: 'no-store',
                signal: controller.signal
            });
            if (!response.ok) {
                const error = new Error('Relay HTTP ' + response.status);
                error.status = response.status;
                let rejection;
                try {
                    rejection = await response.json();
                } catch {
                    // Proxies may return HTML errors; retain the HTTP status in that case.
                }
                if (typeof rejection?.code === 'string' && rejection.code.length <= 64) {
                    error.code = rejection.code;
                }
                if (response.status === 413) {
                    error.message =
                        rejection?.code === 'RELAY_RESULT_TOO_LARGE' &&
                        typeof rejection.error === 'string' &&
                        rejection.error.length <= 256
                            ? rejection.error
                            : 'The editor result exceeds the relay or proxy size limit (HTTP 413).';
                } else if (typeof rejection?.error === 'string' && rejection.error.length <= 512) {
                    error.message = rejection.error;
                }
                throw error;
            }
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    function isTransientTransportError(error) {
        return error.status === undefined || error.status === 408 || error.status === 429 || error.status >= 500;
    }

    async function submitAcknowledged(endpoint, id, response, recoveryMs = RESULT_RECOVERY_MS) {
        // Freeze the exact result once. Retries deliver it again, never execute the frontend action again.
        let body;
        let compact = false;
        try {
            body = JSON.stringify({ id, clientId, ...response });
        } catch {
            // The action has settled. Report the serialization failure so its execution lock can be released.
            body = JSON.stringify({
                id,
                clientId,
                error: 'The editor action completed, but its result could not be serialized. Inspect the editor before retrying the action.'
            });
            compact = true;
        }
        let retryDelay = RETRY_DELAY_MS;
        const deadline = Date.now() + recoveryMs;
        while (Date.now() < deadline) {
            try {
                const acknowledgement = await request(
                    endpoint, body, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now())
                );
                if (acknowledgement?.ok !== true) {
                    throw new Error('Invalid relay result acknowledgement');
                }
                return;
            } catch (error) {
                if (endpoint === 'result' && error.status === 413 && !compact) {
                    body = JSON.stringify({ id, clientId, error: error.message });
                    compact = true;
                    continue;
                }
                if (!isTransientTransportError(error)) {
                    throw error;
                }
                await delay(Math.max(0, Math.min(retryDelay, deadline - Date.now())));
                retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
            }
        }
        throw new Error(
            'Could not confirm delivery of the editor result within ' + recoveryMs / 1000 +
            ' seconds. Inspect the editor before retrying the action.'
        );
    }

    async function requireModule(targetWindow, moduleId, deadline) {
        while (typeof targetWindow.sap?.ui?.require !== 'function') {
            if (Date.now() >= deadline) {
                throw new Error('Timed out waiting for UI5');
            }
            await delay(API_POLL_INTERVAL_MS);
        }
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timed out loading ' + moduleId)), deadline - Date.now());
            targetWindow.sap.ui.require(
                [moduleId],
                (api) => {
                    clearTimeout(timer);
                    if (!api) {
                        reject(new Error(moduleId + ' module resolved to empty'));
                        return;
                    }
                    resolve(api);
                },
                (error) => {
                    clearTimeout(timer);
                    reject(error);
                }
            );
        });
    }

    // Normalizes a raw UFA result into the Flex { isSuccess, payload, error } envelope (mirrors frontend-actions.ts).
    function normalizeUfa(raw) {
        if (raw && typeof raw === 'object' && raw.success === false) {
            const message =
                (typeof raw.error === 'string' && raw.error) ||
                (typeof raw.message === 'string' && raw.message) ||
                'UFA action failed';
            return { isSuccess: false, payload: null, error: { code: 'UFA_ACTION_FAILED', message } };
        }
        const isBareSuccess =
            raw && typeof raw === 'object' && raw.success === true && Object.keys(raw).length === 1;
        return { isSuccess: true, payload: isBareSuccess ? null : raw, error: null };
    }

    async function waitForEditorRta(targetWindow, deadline) {
        let timer;
        try {
            const RuntimeAuthoring = await requireModule(targetWindow, 'sap/ui/rta/RuntimeAuthoring', deadline);
            let instance = RuntimeAuthoring.getCurrentInstance?.();
            while (!instance) {
                if (Date.now() >= deadline) {
                    return false;
                }
                await delay(RTA_POLL_INTERVAL_MS);
                instance = RuntimeAuthoring.getCurrentInstance?.();
            }
            if (Date.now() >= deadline) {
                return false;
            }
            // The current instance exists before start() finishes. getService waits for RTA's start event,
            // and outline.get() waits for DesignTime synchronization, just as the editor's outline does.
            const ready = async () => {
                const outline = await instance.getService('outline');
                await outline.get();
                return true;
            };
            return await Promise.race([
                ready(),
                new Promise((resolve) => {
                    timer = setTimeout(() => resolve(false), deadline - Date.now());
                })
            ]);
        } catch {
            return false;
        } finally {
            clearTimeout(timer);
        }
    }

    async function waitForAppLoaded(deadline) {
        if (!appLoadedListening) {
            return true;
        }
        while (!appLoadedSeen) {
            if (Date.now() >= deadline) {
                return false;
            }
            await delay(APP_LOADED_POLL_INTERVAL_MS);
        }
        return true;
    }

    async function fetchViaContext(payload) {
        // Same-origin only: the editor page fetches its own origin (proxied to the backend), never a foreign host.
        const target = new URL(String(payload?.url ?? ''), location.href);
        if (target.origin !== location.origin) {
            return {
                isSuccess: false,
                payload: null,
                error: { code: 'FETCH_CROSS_ORIGIN', message: 'Refusing cross-origin fetch: ' + target.origin }
            };
        }
        // Abort both the request and body read, leaving time to report failure before the relay expires.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const response = await fetch(target.toString(), {
                credentials: 'include',
                redirect: 'follow',
                cache: 'no-store',
                signal: controller.signal
            });
            const body = await response.text();
            return {
                isSuccess: true,
                payload: { status: response.status, contentType: response.headers.get('content-type') ?? '', body }
            };
        } catch (error) {
            if (controller.signal.aborted) {
                return {
                    isSuccess: false,
                    payload: null,
                    error: { code: 'FETCH_TIMEOUT', message: 'The metadata fetch timed out after 30 seconds.' }
                };
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    function resolveTargetWindow(frameId) {
        const frame = document.getElementById(frameId);
        if (frame && frame.contentWindow) {
            return frame.contentWindow;
        }
        // No child frame: in-frame injection targets this window; in the top document it's a load-order race.
        if (window.self !== window.top) {
            return window;
        }
        throw new Error("[rta-relay] editor frame '" + frameId + "' not found in the top document");
    }

    async function invokeFrontendAction(action, execution, invoke) {
        if (stopped || Date.now() >= execution.deadline) {
            throw new Error('The action deadline expired before the UI5 method was invoked.');
        }
        execution.timer = setTimeout(() => {
            execution.timedOut = true;
            // UI5 does not expose cancellation here. Keep observing the original promise and report
            // only progress; posting a final error would incorrectly release the server's execution lock.
            submitAcknowledged('timeout', action.id, {}).catch((error) =>
                console.error('[rta-relay] Could not report the action timeout:', error)
            );
        }, execution.deadline - Date.now());
        try {
            return await invoke();
        } finally {
            clearTimeout(execution.timer);
        }
    }

    async function callAction(action, execution) {
        // Authenticated same-origin fetch through the editor page; needs no UI5/RTA, so handle it first.
        if (action.actionName === '__fetch__') {
            return await fetchViaContext(action.payload);
        }
        const targetWindow = resolveTargetWindow(action.frameId);
        const deadline = execution.deadline;
        // UFA navigation (describe_ui / execute_page_action) needs no RuntimeAuthoring, so handle it first.
        if (action.actionName.startsWith(UFA_PREFIX)) {
            const method = action.actionName.slice(UFA_PREFIX.length);
            const helpers = await requireModule(targetWindow, UFA_ACTIONS_MODULE, deadline);
            if (typeof helpers?.[method] !== 'function') {
                throw new Error('Frontend action not available: ' + action.actionName);
            }
            return normalizeUfa(await invokeFrontendAction(action, execution, () => helpers[method](action.payload)));
        }
        const api = await requireModule(targetWindow, FLEX_ACTIONS_MODULE, deadline);
        if (action.actionName === '__ready__' || action.actionName === 'com.sap.ui.flex.startRTA.v1') {
            await waitForAppLoaded(deadline);
            const started = await waitForEditorRta(targetWindow, deadline);
            if (!started) {
                return {
                    isSuccess: false,
                    payload: null,
                    error: { code: 'EDITOR_RTA_NOT_STARTED', message: 'The adaptation editor did not start UI adaptation' }
                };
            }
        }
        if (action.actionName === '__ready__') {
            return { isSuccess: true, payload: { ready: true } };
        }
        const method = /^com\.sap\.ui\.flex\.([A-Za-z][A-Za-z\d]*)\.v\d+$/.exec(action.actionName)?.[1];
        if (!method || typeof api?.[method] !== 'function') {
            throw new Error('Frontend action not available: ' + action.actionName);
        }
        return await invokeFrontendAction(action, execution, () => api[method](action.payload));
    }

    async function processAction(action) {
        if (activeAction) {
            // The server normally prevents this. Never execute overlapping UI5 methods even if a
            // malformed/stale delivery reaches this document. The stop command is handled separately.
            if (activeAction.id !== action.id) {
                await submitAcknowledged('result', action.id, { error: 'A previous editor action is still running.' });
            }
            return;
        }
        const budgetMs = Number.isFinite(action.budgetMs)
            ? Math.max(0, Math.min(action.budgetMs, ACTION_DEADLINE_MS))
            : ACTION_DEADLINE_MS;
        const execution = { id: action.id, deadline: Date.now() + budgetMs };
        activeAction = execution;
        let response;
        try {
            response = { result: (await callAction(action, execution)) ?? null };
        } catch (error) {
            response = { error: error?.message ?? String(error) };
        } finally {
            activeAction = undefined;
        }
        if (stopped) {
            return;
        }
        if (execution.timedOut) {
            console.info('[rta-relay] Previously timed-out action settled; inspect the editor before retrying:', action.id);
        }
        await submitAcknowledged('result', action.id, response);
    }

    function externalEditorWindow() {
        try {
            // An embedded editor must never close its cross-origin BAS/IDE host.
            return window.top.location.origin === location.origin ? window.top : undefined;
        } catch {
            return undefined;
        }
    }

    async function pollLoop() {
        let recoveryDeadline;
        let retryDelay = RETRY_DELAY_MS;
        while (true) {
            if (recoveryDeadline !== undefined && Date.now() >= recoveryDeadline) {
                console.error(
                    '[rta-relay] Connection recovery timed out. Keep one editor tab open and refresh it to reconnect.'
                );
                return;
            }
            let action;
            try {
                action = await request(
                    'poll?clientId=' + encodeURIComponent(clientId),
                    undefined,
                    recoveryDeadline === undefined
                        ? REQUEST_TIMEOUT_MS
                        : Math.min(REQUEST_TIMEOUT_MS, recoveryDeadline - Date.now())
                );
            } catch (error) {
                const temporaryConflict =
                    error.status === 409 &&
                    ['RELAY_OWNER_ACTIVE', 'RELAY_POLL_PENDING', 'RELAY_RESULT_PENDING'].includes(error.code);
                if (!temporaryConflict && !isTransientTransportError(error)) {
                    console.error('[rta-relay] Polling stopped:', error);
                    return;
                }
                recoveryDeadline ??= Date.now() + POLL_RECOVERY_MS;
                await delay(Math.max(0, Math.min(retryDelay, recoveryDeadline - Date.now())));
                retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
                continue;
            }
            recoveryDeadline = undefined;
            retryDelay = RETRY_DELAY_MS;
            if (!action) {
                continue;
            }
            if (action.actionName === '__reload__' || action.actionName === '__stop__') {
                if (activeAction && action.actionName === '__reload__') {
                    await submitAcknowledged('result', action.id, { error: 'Cannot reload while an editor action is running.' });
                    continue;
                }
                stopped = true;
                clearTimeout(activeAction?.timer);
                const result = action.actionName === '__reload__' ? { reloaded: true } : { stopped: true };
                const closeTarget =
                    action.actionName === '__stop__' && action.payload?.closeWindow === true
                        ? externalEditorWindow()
                        : undefined;
                if (action.payload?.closeWindow === true) {
                    result.closeRequested = !!closeTarget;
                }
                try {
                    await submitAcknowledged(
                        'result', action.id, { result },
                        action.actionName === '__stop__' ? STOP_RESULT_RECOVERY_MS : RESULT_RECOVERY_MS
                    );
                } catch (error) {
                    console.error('[rta-relay] lifecycle result POST failed:', error);
                }
                // Acknowledge before closing so MCP can finish stopping the owned server.
                // Browsers may refuse window.close(), especially for manually opened tabs.
                closeTarget?.close();
                if (action.actionName === '__reload__') {
                    const shell = window.parent && window.parent !== window ? window.parent : undefined;
                    if (shell) {
                        shell.postMessage(
                            {
                                type: POST_MESSAGE_ACTION_ENVELOPE_TYPE,
                                action: { type: RELOAD_ACTION_TYPE, payload: { save: false } }
                            },
                            location.origin
                        );
                    } else {
                        location.reload();
                    }
                }
                return;
            }
            // Keep polling for shutdown while UI5 is running. The server accepts no other editor
            // commands until the actual result arrives, including after a timeout or disconnect.
            const processing = processAction(action).catch((error) => {
                console.error(
                    '[rta-relay] Result delivery was not confirmed. Inspect the editor before retrying the action:', error
                );
            });
            if (!action.actionName.startsWith('com.sap.ui.')) {
                await processing;
            }
        }
    }

    pollLoop().catch((error) => console.error('[rta-relay]', error));
})();
