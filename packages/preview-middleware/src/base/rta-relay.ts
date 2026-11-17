import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { escapeXML } from 'ejs';
import { json, type NextFunction, type Request, type Response, type Router } from 'express';

const API = '/adp/api/rta';
const POLL_TIMEOUT_MS = 25000;
const ACTION_TIMEOUT_MS = 60000;
const FETCH_DELIVERY_TIMEOUT_MS = 5000;
const OWNER_LEASE_MS = 30000;
const COMMAND_LIMIT_BYTES = 100 * 1024;
const DEFAULT_RESULT_LIMIT_BYTES = 10 * 1024 * 1024;
const RESULT_ACK_TTL_MS = 120000;
const MAX_RESULT_ACKS = 64;

/** Relay client script, read once at module load and served verbatim — no per-request file access. */
const RELAY_CLIENT_JS = readFileSync(new URL('../../templates/rta-relay-client.js', import.meta.url), 'utf8');

interface PendingAction {
    id: string;
    actionName: string;
    payload: Record<string, unknown>;
    frameId?: string;
    delivered: boolean;
    clientId?: string;
    deliveryTimer?: ReturnType<typeof setTimeout>;
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

/** Frontend action names the relay accepts: flex actions, UFA actions, the lifecycle sentinels, and `__fetch__`. */
const ACTION_NAME_PATTERN =
    /^(?:com\.sap\.ui\.flex\.[A-Za-z][A-Za-z\d]*\.v\d+|com\.sap\.ui\.unified\.frontend\.actions\.[A-Za-z][A-Za-z\d]*|__reload__|__ready__|__stop__|__fetch__)$/;

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
 * Fingerprint results without retaining their potentially large payloads.
 *
 * @param body Validated result submission.
 * @returns Digest used to identify an identical retransmission.
 */
function resultDigest(body: ResultBody): string {
    return createHash('sha256')
        .update(JSON.stringify({ result: body.result, error: body.error }))
        .digest('hex');
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
    if (
        !isObject(body) ||
        typeof body.id !== 'string' ||
        body.id.length === 0 ||
        typeof body.clientId !== 'string' ||
        body.clientId.length === 0
    ) {
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
    const configuredLimit = Number(process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES);
    // Reserve enough space for a compact error envelope even when the configured result limit is small.
    const resultLimitBytes =
        Number.isSafeInteger(configuredLimit) && configuredLimit >= 1024 ? configuredLimit : DEFAULT_RESULT_LIMIT_BYTES;

    let pending: PendingAction | undefined;
    let poll: PollWaiter | undefined;
    let owner: { clientId: string; lastSeen: number } | undefined;
    // Keep retired documents fenced out for the lifetime of this editor session.
    const retiredClients = new Set<string>();
    const waitingClients = new Set<string>();
    const resultAcks = new Map<string, { clientId: string; digest: string; expiresAt: number }>();

    const retireWaitingClients = (): void => {
        for (const clientId of waitingClients) {
            retiredClients.add(clientId);
        }
        waitingClients.clear();
    };

    const pruneResultAcks = (): void => {
        for (const [id, ack] of resultAcks) {
            if (ack.expiresAt <= Date.now()) {
                resultAcks.delete(id);
            }
        }
    };

    const rememberResult = (body: ResultBody): void => {
        pruneResultAcks();
        if (resultAcks.size >= MAX_RESULT_ACKS) {
            const oldest = resultAcks.keys().next().value;
            if (oldest !== undefined) {
                resultAcks.delete(oldest);
            }
        }
        resultAcks.set(body.id, {
            clientId: body.clientId,
            digest: resultDigest(body),
            expiresAt: Date.now() + RESULT_ACK_TTL_MS
        });
    };

    const deliver = (): void => {
        if (!poll || !pending || pending.delivered) {
            return;
        }
        const waiter = poll;
        poll = undefined;
        clearTimeout(waiter.timer);
        clearTimeout(pending.deliveryTimer);
        pending.delivered = true;
        pending.clientId = waiter.clientId;
        waiter.res.json({
            id: pending.id,
            actionName: pending.actionName,
            payload: pending.payload,
            frameId: pending.frameId
        });
    };

    const pollRejection = (clientId: string): { code: string; error: string } | undefined => {
        if (retiredClients.has(clientId)) {
            return { code: 'RELAY_CLIENT_RETIRED', error: 'This editor document has been retired.' };
        }
        if (pending?.delivered) {
            return { code: 'RELAY_RESULT_PENDING', error: 'The relay is waiting for the current action result.' };
        }
        if (poll) {
            return { code: 'RELAY_POLL_PENDING', error: 'The relay already has an active poll.' };
        }
        if (owner && owner.clientId !== clientId && Date.now() - owner.lastSeen < OWNER_LEASE_MS) {
            return { code: 'RELAY_OWNER_ACTIVE', error: 'Another editor document still owns the relay.' };
        }
        return undefined;
    };

    router.get(`${API}/client.js`, (_req, res) => {
        res.set('Cache-Control', 'no-store');
        res.type('application/javascript').send(RELAY_CLIENT_JS);
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

    router.get(`${API}/poll`, (req, res) => {
        const clientId = req.query.clientId;
        if (!isValidClientId(clientId)) {
            res.status(400).json({ error: 'clientId is required' });
            return;
        }
        const rejection = pollRejection(clientId);
        if (rejection) {
            if (owner?.clientId === clientId) {
                // An owner recovering a lost poll/result is still active while the current action is pending.
                owner.lastSeen = Date.now();
            } else if (rejection.code !== 'RELAY_CLIENT_RETIRED') {
                waitingClients.add(clientId);
            }
            res.status(409).json(rejection);
            return;
        }
        waitingClients.delete(clientId);
        if (owner && owner.clientId !== clientId) {
            retiredClients.add(owner.clientId);
            retireWaitingClients();
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

    router.post(`${API}/action`, json({ limit: COMMAND_LIMIT_BYTES }), (req, res) => {
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
            const delivered = pending?.delivered;
            pending = undefined;
            if (body.actionName === '__fetch__') {
                res.status(504).json({
                    code: 'RELAY_FETCH_RESULT_TIMEOUT',
                    error: 'The editor tab picked up the metadata request but did not return a result within 60 seconds.'
                });
            } else if (delivered) {
                // A 504 triggers the MCP start/login retry. Do not replay a delivered action with an unknown outcome.
                res.status(500).json({
                    code: 'RELAY_ACTION_OUTCOME_UNKNOWN',
                    error:
                        'The action was delivered to the editor, but no result was confirmed within 60 seconds. ' +
                        'Its outcome is unknown; inspect the editor before retrying.'
                });
            } else {
                res.status(504).json({ error: 'Timeout: browser client did not respond within 60 s' });
            }
        }, ACTION_TIMEOUT_MS);
        // Metadata needs an already logged-in editor. Allow normal gaps between polls, but do not
        // wait a full action timeout when the editor is closed, on login, or no longer polling.
        const deliveryTimer =
            body.actionName === '__fetch__'
                ? setTimeout(() => {
                      clearTimeout(timer);
                      pending = undefined;
                      res.status(504).json({
                          code: 'RELAY_CLIENT_UNAVAILABLE',
                          error:
                              'No editor tab picked up the metadata request within 5 seconds. ' +
                              'Open or refresh the Editor URL returned by open_adaptation_editor, complete any login, and retry.'
                      });
                  }, FETCH_DELIVERY_TIMEOUT_MS)
                : undefined;
        pending = {
            id: randomBytes(16).toString('hex'),
            actionName: body.actionName,
            payload: body.payload ?? {},
            frameId: body.frameId,
            delivered: false,
            deliveryTimer,
            res,
            timer
        };
        res.once('close', () => {
            clearTimeout(timer);
            clearTimeout(deliveryTimer);
            if (pending?.res === res) {
                pending = undefined;
            }
        });
        deliver();
    });

    router.post(`${API}/result`, json({ limit: resultLimitBytes }), (req, res) => {
        const body: unknown = req.body;
        if (!isValidResultBody(body)) {
            res.status(400).json({ error: 'Invalid result' });
            return;
        }
        pruneResultAcks();
        const acknowledged = resultAcks.get(body.id);
        if (acknowledged) {
            if (acknowledged.clientId !== body.clientId || acknowledged.digest !== resultDigest(body)) {
                res.status(409).json({
                    code: 'RELAY_RESULT_CONFLICT',
                    error: 'A different result was already accepted for this action.'
                });
            } else {
                // Acknowledgement recovery must not change ownership or consume a newer pending action.
                res.json({ ok: true });
            }
            return;
        }
        if (pending?.id !== body.id) {
            res.status(404).json({
                code: 'RELAY_ACTION_UNKNOWN',
                error: 'The action is no longer pending; its result cannot be confirmed.'
            });
            return;
        }
        if (!pending.delivered || pending.clientId !== body.clientId || owner?.clientId !== body.clientId) {
            res.status(409).json({
                code: 'RELAY_RESULT_OWNER_MISMATCH',
                error: 'Result must come from the owning document'
            });
            return;
        }
        const action = pending;
        rememberResult(body);
        pending = undefined;
        clearTimeout(action.timer);
        owner.lastSeen = Date.now();
        if (body.error !== undefined) {
            action.res.status(500).json({ error: body.error });
        } else {
            if (action.actionName === '__reload__' || action.actionName === '__stop__') {
                retiredClients.add(body.clientId);
                // Tabs already waiting before reload are not the newly loaded document.
                retireWaitingClients();
                owner = undefined;
            }
            action.res.json({ result: body.result, clientId: body.clientId });
        }
        res.json({ ok: true });
    });
    router.use(`${API}/result`, (error: unknown, _req: Request, res: Response, next: NextFunction) => {
        if (isObject(error) && error.type === 'entity.too.large') {
            // Keep the pending action until its owning document submits a compact error with matching IDs.
            res.status(413).json({
                code: 'RELAY_RESULT_TOO_LARGE',
                error: `The editor result exceeds the configured relay limit (${resultLimitBytes} bytes).`
            });
            return;
        }
        next(error);
    });

    return {
        clientTag: (baseUrl = '') =>
            `<script src="${escapeXML(baseUrl)}${API}/client.js" data-token="${token}" defer></script>\n`
    };
}
