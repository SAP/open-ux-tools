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

/** Frontend action names the relay accepts: flex actions plus the lifecycle sentinels. */
const ACTION_NAME_PATTERN = /^(?:com\.sap\.ui\.flex\.[A-Za-z][A-Za-z\d]*\.v\d+|__reload__|__ready__|__stop__)$/;

interface ActionBody {
    actionName: string;
    payload?: Record<string, unknown>;
    frameId?: string;
}

interface ResultBody {
    id: string;
    clientId: string;
    error?: string;
    result?: unknown;
}

/**
 * Validates the `clientId` query parameter: a short, opaque, URL-safe identifier.
 *
 * @param value raw query value
 * @returns whether it is a usable clientId
 */
function isValidClientId(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[^\w-]/.test(value);
}

/**
 * Validates a POST /action body. The anchored name pattern already rejects any whitespace.
 *
 * @param body parsed request body
 * @returns whether it is a well-formed action request
 */
function isValidActionBody(body: unknown): body is ActionBody {
    return (
        isObject(body) &&
        typeof body.actionName === 'string' &&
        ACTION_NAME_PATTERN.test(body.actionName) &&
        (body.payload === undefined || isObject(body.payload)) &&
        (body.frameId === undefined || (typeof body.frameId === 'string' && body.frameId.trim() !== ''))
    );
}

/**
 * Validates a POST /result body: id + clientId, and exactly one of `error` (string) or `result`.
 *
 * @param body parsed request body
 * @returns whether it is a well-formed result submission
 */
function isValidResultBody(body: unknown): body is ResultBody {
    if (!isObject(body) || typeof body.id !== 'string' || typeof body.clientId !== 'string') {
        return false;
    }
    return body.error !== undefined
        ? typeof body.error === 'string' && !Object.hasOwn(body, 'result')
        : Object.hasOwn(body, 'result');
}

/**
 * Register an opt-in, single-action relay owned by this preview router.
 * The public script contains no secret; all API requests require the token in `X-Relay-Token`.
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

    // Rejects a poll that is not the current owner, collides with an existing one, or was retired.
    const isPollRejected = (clientId: string): boolean =>
        clientId === releasedClientId ||
        poll !== undefined ||
        pending?.delivered === true ||
        (owner !== undefined && owner.clientId !== clientId && Date.now() - owner.lastSeen < OWNER_LEASE_MS);

    router.get(`${API}/client.js`, (_req, res) => {
        res.set('Cache-Control', 'no-store');
        res.type('application/javascript').send(
            readFileSync(new URL('../../templates/rta-relay-client.js', import.meta.url), 'utf8')
        );
    });
    router.use(API, (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        // Not Authorization: the BAS ingress router answers 401 to browser requests that set it.
        if (req.headers['x-relay-token'] !== token) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        next();
    });
    router.use(API, json());

    router.get(`${API}/poll`, (req, res) => {
        const clientId = req.query.clientId;
        if (!isValidClientId(clientId)) {
            res.status(400).json({ error: 'clientId is required' });
            return;
        }
        if (isPollRejected(clientId)) {
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
        if (!isValidActionBody(body)) {
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
        if (!isValidResultBody(body)) {
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
