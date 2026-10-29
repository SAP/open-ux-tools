(function () {
    'use strict';

    const REQUEST_TIMEOUT_MS = 30000;
    const ACTION_DEADLINE_MS = 55000;
    const API_POLL_INTERVAL_MS = 200;
    const RTA_POLL_INTERVAL_MS = 250;
    const RETRY_DELAY_MS = 1000;

    // Capture currentScript before any await. Deriving endpoints from its URL preserves mount prefixes.
    const script = document.currentScript;
    const token = script.dataset.token;
    const base = new URL('.', script.src);
    const clientId = crypto.randomUUID();

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

    async function callAction(action) {
        // The script can already be inside the editor's "preview" frame. Descend only if it exists here.
        const targetWindow = document.getElementById(action.frameId)?.contentWindow ?? window;
        const deadline = Date.now() + ACTION_DEADLINE_MS;
        const api = await resolveApi(targetWindow, deadline);
        if (action.actionName === '__ready__' || action.actionName === 'com.sap.ui.flex.startRTA.v1') {
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
                await request('result', { id: action.id, clientId, result });
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
            await request('result', { id: action.id, clientId, ...response });
        }
    }

    pollLoop().catch((error) => console.error('[rta-relay]', error));
})();
