import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Request, Response } from 'express';

/** Shared with the BAS launcher; separate from the MCP open/close mailbox. */
const LOGIN_FILE = join(tmpdir(), 'sap-ux-adp-login.json');
const LOGIN_PARAM = 'sap-ux-adp-login';
const COMPLETE_PARAM = 'sap-ux-adp-login-complete';

const LOGIN_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Adaptation editor login</title></head>
<body><h1>Adaptation editor login</h1><p id="status">Finishing sign-in…</p>
<script>
(async function () {
    const status = document.getElementById('status');
    try {
        const url = new URL(location.href);
        url.searchParams.set('${COMPLETE_PARAM}', 'true');
        const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok || (await response.json()).ok !== true) {
            throw new Error('Login completion failed');
        }
        status.textContent = 'Login complete. Return to BAS; the editor will reload automatically. You can close this tab.';
    } catch {
        status.textContent = 'Could not notify BAS. Return to BAS and open the adaptation editor again to retry.';
    }
}());
</script></body></html>`;

/**
 * Serve login-only requests on the existing authenticated editor route. The completion
 * request runs after the browser receives the login response and its session cookie.
 * No editor bootstrap or RTA relay is served, even for invalid or expired attempts.
 *
 * @param req editor request, after the configured CF authentication middleware
 * @param res editor response
 * @param enabled whether this editor has the MCP relay enabled
 * @returns whether the request was handled as a login request
 */
export function handleAdpLogin(req: Request, res: Response, enabled: boolean): boolean {
    if (!(LOGIN_PARAM in req.query)) {
        return false;
    }
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    const id = req.query[LOGIN_PARAM];
    if (!enabled || typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) {
        res.status(400).type('text/plain').send('Invalid adaptation editor login request.');
        return true;
    }
    let attempt: unknown;
    try {
        attempt = JSON.parse(readFileSync(LOGIN_FILE, 'utf8'));
    } catch {
        // A missing or partially written mailbox is not a valid login attempt.
    }
    if (
        typeof attempt !== 'object' ||
        attempt === null ||
        !('id' in attempt) ||
        attempt.id !== id ||
        !('status' in attempt) ||
        (attempt.status !== 'pending' && attempt.status !== 'complete')
    ) {
        res.status(410).type('text/plain').send('This login request has expired. Return to BAS and reopen the editor.');
        return true;
    }
    if (req.query[COMPLETE_PARAM] === 'true') {
        if (attempt.status === 'pending') {
            writeFileSync(LOGIN_FILE, JSON.stringify({ id, status: 'complete' }), { mode: 0o600 });
        }
        res.json({ ok: true });
    } else {
        res.type('text/html').send(LOGIN_PAGE);
    }
    return true;
}
