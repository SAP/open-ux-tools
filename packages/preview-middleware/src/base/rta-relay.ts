import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { escapeXML } from 'ejs';
import { json, type Response, type Router } from 'express';

const API = '/adp/api/rta';
const POLL_TIMEOUT_MS = 25000;
const ACTION_TIMEOUT_MS = 60000;
const OWNER_LEASE_MS = 30000;

interface PendingAction {
    id: string;
    actionName: string;
    payload: Record<string, unknown>;
    frameId?: string;
    delivered: boolean;
    clientId?: string;
    res: Response;
    timer: ReturnType<typeof setTimeout>;
}

interface PollWaiter {
    clientId: string;
    res: Response;
    timer: ReturnType<typeof setTimeout>;
}

/**
 * Check JSON objects without accepting null or arrays.
 *
 * @param value value to check
 * @returns whether the value is an object
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Register an opt-in, single-action relay owned by this preview router.
 * The public script contains no secret; all API requests require the bearer token.
 *
 * @param router preview router
 * @param token child-process relay token (exactly 64 hexadecimal characters)
 * @returns client tag renderer, or undefined when the token is invalid
 */
export function addRtaRelayApis(
    router: Router,
    token: string
): { clientTag: (baseUrl?: string) => string } | undefined {
    if (token.length !== 64 || !/^[\da-f]{64}$/i.test(token)) {
        return undefined;
    }

    let pending: PendingAction | undefined;
    let poll: PollWaiter | undefined;
    let owner: { clientId: string; lastSeen: number } | undefined;
    let releasedClientId: string | undefined;

    const deliver = (): void => {
        if (!poll || !pending || pending.delivered) {
            return;
        }
        const waiter = poll;
        poll = undefined;
        clearTimeout(waiter.timer);
        pending.delivered = true;
        pending.clientId = waiter.clientId;
        waiter.res.json({
            id: pending.id,
            actionName: pending.actionName,
            payload: pending.payload,
            frameId: pending.frameId
        });
    };

    router.get(`${API}/client.js`, (_req, res) => {
        res.set('Cache-Control', 'no-store');
        res.type('application/javascript').send(
            readFileSync(new URL('../../templates/rta-relay-client.js', import.meta.url), 'utf8')
        );
    });
    router.use(API, (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        if (req.headers.authorization !== `Bearer ${token}`) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        next();
    });
    router.use(API, json());

    router.get(`${API}/poll`, (req, res) => {
        const clientId = req.query.clientId;
        if (typeof clientId !== 'string' || !clientId || clientId.length > 128 || /[^\w-]/.test(clientId)) {
            res.status(400).json({ error: 'clientId is required' });
            return;
        }
        if (
            clientId === releasedClientId ||
            poll ||
            pending?.delivered ||
            (owner && owner.clientId !== clientId && Date.now() - owner.lastSeen < OWNER_LEASE_MS)
        ) {
            res.status(409).json({ error: 'Relay owned by another poll or document' });
            return;
        }
        owner = { clientId, lastSeen: Date.now() };
        const timer = setTimeout(() => {
            poll = undefined;
            res.json(null);
        }, POLL_TIMEOUT_MS);
        poll = { clientId, res, timer };
        res.once('close', () => {
            clearTimeout(timer);
            if (owner?.clientId === clientId) {
                owner.lastSeen = Date.now();
            }
            if (poll?.res === res) {
                poll = undefined;
            }
        });
        deliver();
    });

    router.post(`${API}/action`, (req, res) => {
        const body: unknown = req.body;
        if (
            !isObject(body) ||
            typeof body.actionName !== 'string' ||
            body.actionName.trim() !== body.actionName ||
            !/^(?:com\.sap\.ui\.flex\.[A-Za-z][A-Za-z\d]*\.v\d+|__reload__|__ready__|__stop__)$/.test(
                body.actionName
            ) ||
            (body.payload !== undefined && !isObject(body.payload)) ||
            (body.frameId !== undefined && (typeof body.frameId !== 'string' || !body.frameId.trim()))
        ) {
            res.status(400).json({ error: 'Invalid actionName, payload or frameId' });
            return;
        }
        if (pending) {
            res.status(409).json({ error: 'Relay busy' });
            return;
        }
        const timer = setTimeout(() => {
            pending = undefined;
            res.status(504).json({ error: 'Timeout: browser client did not respond within 60 s' });
        }, ACTION_TIMEOUT_MS);
        pending = {
            id: randomBytes(16).toString('hex'),
            actionName: body.actionName,
            payload: body.payload ?? {},
            frameId: body.frameId,
            delivered: false,
            res,
            timer
        };
        res.once('close', () => {
            clearTimeout(timer);
            if (pending?.res === res) {
                pending = undefined;
            }
        });
        deliver();
    });

    router.post(`${API}/result`, (req, res) => {
        const body: unknown = req.body;
        if (
            !isObject(body) ||
            typeof body.id !== 'string' ||
            typeof body.clientId !== 'string' ||
            (body.error !== undefined
                ? typeof body.error !== 'string' || Object.hasOwn(body, 'result')
                : !Object.hasOwn(body, 'result'))
        ) {
            res.status(400).json({ error: 'Invalid result' });
            return;
        }
        if (pending?.id !== body.id) {
            res.status(404).json({ error: 'Unknown action id' });
            return;
        }
        if (!pending.delivered || pending.clientId !== body.clientId || owner?.clientId !== body.clientId) {
            res.status(409).json({ error: 'Result must come from the owning document' });
            return;
        }
        const action = pending;
        pending = undefined;
        clearTimeout(action.timer);
        owner.lastSeen = Date.now();
        if (body.error !== undefined) {
            action.res.status(500).json({ error: body.error });
        } else {
            if (action.actionName === '__reload__' || action.actionName === '__stop__') {
                releasedClientId = body.clientId;
                owner = undefined;
            }
            action.res.json({ result: body.result, clientId: body.clientId });
        }
        res.json({ ok: true });
    });

    return {
        clientTag: (baseUrl = '') =>
            `<script src="${escapeXML(baseUrl)}${API}/client.js" data-token="${token}" defer></script>\n`
    };
}
