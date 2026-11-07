(function () {
    'use strict';

    const REQUEST_TIMEOUT_MS = 30000;
    const ACTION_DEADLINE_MS = 55000;
    const API_POLL_INTERVAL_MS = 200;
    const RTA_POLL_INTERVAL_MS = 250;
    const RETRY_DELAY_MS = 1000;
    const APP_LOADED_POLL_INTERVAL_MS = 200;
    const APP_LOADED_ENVELOPE_TYPE = 'post-message-action';
    const APP_LOADED_ACTION_TYPE = '[ext] app-loaded';

    // Capture currentScript before any await. Deriving endpoints from its URL preserves mount prefixes.
    const script = document.currentScript;
    const token = script.dataset.token;
    const base = new URL('.', script.src);
    const clientId = crypto.randomUUID();

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
                data.type === APP_LOADED_ENVELOPE_TYPE &&
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

    async function request(endpoint, body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(new URL(endpoint, base), {
                method: body === undefined ? 'GET' : 'POST',
                headers: { 'X-Relay-Token': token, 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body),
                cache: 'no-store',
                signal: controller.signal
            });
            if (!response.ok) {
                const error = new Error('Relay HTTP ' + response.status);
                error.status = response.status;
                throw error;
            }
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    async function resolveApi(targetWindow, deadline) {
        while (typeof targetWindow.sap?.ui?.require !== 'function') {
            if (Date.now() >= deadline) {
                throw new Error('Timed out waiting for UI5');
            }
            await delay(API_POLL_INTERVAL_MS);
        }
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(
                () => reject(new Error('Timed out loading FrontendActionsAPI')),
                deadline - Date.now()
            );
            targetWindow.sap.ui.require(
                ['sap/ui/rta/api/FrontendActionsAPI'],
                (api) => {
                    clearTimeout(timer);
                    if (!api) {
                        reject(new Error('FrontendActionsAPI module resolved to empty'));
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

    async function waitForEditorRta(targetWindow, deadline) {
        const RuntimeAuthoring = await new Promise((resolve) =>
            targetWindow.sap.ui.require(['sap/ui/rta/RuntimeAuthoring'], resolve, () => resolve(undefined))
        );
        while (!RuntimeAuthoring?.getCurrentInstance?.()) {
            if (Date.now() >= deadline) {
                return false;
            }
            await delay(RTA_POLL_INTERVAL_MS);
        }
        return true;
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
        // Same-origin only: the editor page may fetch its own origin (the preview-middleware
        // proxy forwards authenticated backend requests), never a foreign host.
        const target = new URL(String(payload?.url ?? ''), location.href);
        if (target.origin !== location.origin) {
            return {
                isSuccess: false,
                payload: null,
                error: { code: 'FETCH_CROSS_ORIGIN', message: 'Refusing cross-origin fetch: ' + target.origin }
            };
        }
        const response = await fetch(target.toString(), {
            credentials: 'include',
            redirect: 'follow',
            cache: 'no-store'
        });
        const body = await response.text();
        return {
            isSuccess: true,
            payload: { status: response.status, contentType: response.headers.get('content-type') ?? '', body }
        };
    }

    function resolveTargetWindow(frameId) {
        const frame = document.getElementById(frameId);
        if (frame && frame.contentWindow) {
            return frame.contentWindow;
        }
        // No child frame. If this script runs inside a frame, this window IS the editor frame
        // (expected in-frame injection). Only in the top document is a missing child frame a real
        // load-order race, surfaced as a clear error instead of silently targeting the wrong window.
        if (window.self !== window.top) {
            return window;
        }
        throw new Error("[rta-relay] editor frame '" + frameId + "' not found in the top document");
    }

    async function callAction(action) {
        // Authenticated same-origin fetch through the editor page; needs no UI5/RTA, so handle it first.
        if (action.actionName === '__fetch__') {
            return await fetchViaContext(action.payload);
        }
        const targetWindow = resolveTargetWindow(action.frameId);
        const deadline = Date.now() + ACTION_DEADLINE_MS;
        const api = await resolveApi(targetWindow, deadline);
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
        return await api[method](action.payload);
    }

    async function pollLoop() {
        while (true) {
            let action;
            try {
                action = await request('poll?clientId=' + encodeURIComponent(clientId));
            } catch (error) {
                if (error.status === 401 || error.status === 409) {
                    return;
                }
                // Only the read-only poll is retried; actions and result submissions are never replayed.
                await delay(RETRY_DELAY_MS);
                continue;
            }
            if (!action) {
                continue;
            }
            if (action.actionName === '__reload__' || action.actionName === '__stop__') {
                const result = action.actionName === '__reload__' ? { reloaded: true } : { stopped: true };
                try {
                    await request('result', { id: action.id, clientId, result });
                } catch (error) {
                    console.error('[rta-relay] lifecycle result POST failed:', error);
                }
                if (action.actionName === '__reload__') {
                    location.reload();
                }
                return;
            }
            let response;
            try {
                response = { result: (await callAction(action)) ?? null };
            } catch (error) {
                response = { error: error.message ?? String(error) };
            }
            try {
                await request('result', { id: action.id, clientId, ...response });
            } catch (error) {
                console.error('[rta-relay] result POST failed, continuing poll loop:', error);
            }
        }
    }

    pollLoop().catch((error) => console.error('[rta-relay]', error));
})();
