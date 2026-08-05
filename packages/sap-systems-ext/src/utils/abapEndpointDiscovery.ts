import { create } from '@sap-ux/axios-extension';
import SystemsLogger from './logger';

/** Per-request timeout when probing candidate endpoints (ms). */
const PROBE_TIMEOUT_MS = 3000;
/** Max concurrent probes so we don't open hundreds of sockets at once. */
const PROBE_CONCURRENCY = 40;
/** ADT ping path used to verify an ABAP HTTP(S) endpoint is really there. */
const ADT_PING_PATH = '/sap/bc/ping';
/** Common message-server HTTP ports to try before scanning a bounded range. */
const MSG_SERVER_COMMON_PORTS = [8101, 8100];
/** Bounded range for the message-server HTTP port bootstrap (81NN). */
const MSG_SERVER_RANGE: [number, number] = [8100, 8199];

/**
 * A resolved HTTPS endpoint for an ABAP application server.
 */
export interface ResolvedHttpsEndpoint {
    /** Full base URL, e.g. "https://host:port". */
    url: string;
    /** Host name. */
    host: string;
    /** Port as a string. */
    port: string;
}

/**
 * Discovers the external HTTPS endpoint for an ABAP system reachable via a message server host.
 *
 * Strategy (no RFC port is ever used):
 *  1. Query the message server's HTTP logon endpoint (`/msgserver/text/logon`) which lists each
 *     application server's real HTTP/HTTPS ports. This is authoritative — no port guessing for the
 *     app server. The message server's own HTTP port is found by trying common patterns then a
 *     bounded 8100-8199 range.
 *  2. If the message server list is unreachable, directly brute-force a focused set of common
 *     HTTPS ports (443, 44300-44399, 50000-50099, plus 8443/8000/8080/80) against the host.
 *  3. Every HTTPS candidate is verified with an ADT ping before being accepted.
 *
 * @param messageServer - the message server host name from the RFC destination
 * @param client - SAP client, used for the verification ping
 * @returns the first verified HTTPS endpoint, or undefined if none could be found
 */
export async function discoverHttpsEndpoint(
    messageServer: string,
    client?: string
): Promise<ResolvedHttpsEndpoint | undefined> {
    SystemsLogger.logger.info(`Discovering HTTPS endpoint for message server '${messageServer}'.`);

    // 1) Authoritative: ask the message server for its application servers' ports.
    const fromList = await resolveViaMessageServerList(messageServer, client);
    if (fromList) {
        SystemsLogger.logger.info(
            `Resolved HTTPS endpoint '${fromList.url}' (host '${fromList.host}', port ${fromList.port}) from the message server logon list.`
        );
        return fromList;
    }

    // 2) Fallback: directly probe a focused set of common HTTPS ports on the host.
    SystemsLogger.logger.info(
        `Message server logon list did not yield a verified HTTPS endpoint for '${messageServer}'; brute-forcing common HTTPS ports (443, 44300-44399, 50000-50099, 8443/8000/8080/80).`
    );
    const port = await firstVerifiedPort(messageServer, focusedHttpsCandidatePorts(), 'https', client);
    if (port !== undefined) {
        const endpoint = toEndpoint(messageServer, port, 'https');
        SystemsLogger.logger.info(
            `Resolved HTTPS endpoint '${endpoint.url}' (host '${endpoint.host}', port ${endpoint.port}) by probing common HTTPS ports on the message server host.`
        );
        return endpoint;
    }
    SystemsLogger.logger.warn(`Could not determine an HTTPS endpoint for message server '${messageServer}'.`);
    return undefined;
}

/**
 * Queries the message server logon endpoint for application servers and returns the first verified
 * HTTPS endpoint among them (preferring HTTPS over HTTP).
 *
 * @param messageServer - message server host
 * @param client - SAP client for verification
 * @returns a verified HTTPS endpoint or undefined
 */
async function resolveViaMessageServerList(
    messageServer: string,
    client?: string
): Promise<ResolvedHttpsEndpoint | undefined> {
    const msgHttpPort = await findMessageServerHttpPort(messageServer);
    if (msgHttpPort === undefined) {
        SystemsLogger.logger.info(
            `No message server HTTP port responded on '${messageServer}' (tried ${MSG_SERVER_COMMON_PORTS.join(', ')} then ${MSG_SERVER_RANGE[0]}-${MSG_SERVER_RANGE[1]}).`
        );
        return undefined;
    }
    SystemsLogger.logger.info(
        `Message server HTTP port ${msgHttpPort} responded on '${messageServer}'; reading /msgserver/text/logon.`
    );
    let text: string;
    try {
        text = await httpGetText(messageServer, msgHttpPort, '/msgserver/text/logon');
    } catch {
        SystemsLogger.logger.info(`Failed to read the logon list from '${messageServer}:${msgHttpPort}'.`);
        return undefined;
    }
    const services = parseLogonServices(text);
    const httpsServices = services.filter((s) => s.prot.toLowerCase() === 'https');
    SystemsLogger.logger.info(
        `Logon list advertised ${httpsServices.length} HTTPS endpoint(s): ${
            httpsServices.map((s) => `${s.host}:${s.port}`).join(', ') || '(none)'
        }.`
    );
    // Prefer HTTPS services; verify each in listed order and return the first that answers.
    for (const svc of httpsServices) {
        SystemsLogger.logger.info(
            `Verifying advertised HTTPS endpoint 'https://${svc.host}:${svc.port}' via ADT ping.`
        );
        if (await verifyAdtEndpoint(svc.host, svc.port, 'https', client)) {
            return toEndpoint(svc.host, svc.port, 'https');
        }
        SystemsLogger.logger.info(`Advertised HTTPS endpoint 'https://${svc.host}:${svc.port}' did not verify.`);
    }
    return undefined;
}

/**
 * A protocol/host/port entry parsed from the message server logon response.
 */
interface LogonService {
    prot: string;
    host: string;
    port: number;
}

/**
 * Parses the tab-delimited `/msgserver/text/logon` response into service entries.
 * Each application-server block is a header line followed by "PROT\thost\tport[\textra]" lines.
 *
 * @param text - the raw logon response
 * @returns the parsed service entries
 */
function parseLogonServices(text: string): LogonService[] {
    const services: LogonService[] = [];
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('version')) {
            continue;
        }
        const parts = line.split('\t');
        if (parts.length >= 3) {
            const port = Number.parseInt(parts[2], 10);
            if (Number.isFinite(port)) {
                services.push({ prot: parts[0], host: parts[1], port });
            }
        }
    }
    return services;
}

/**
 * Finds the message server's own HTTP port by trying common patterns, then a bounded 8100-8199
 * range, checking each with a `/msgserver/text/logon` request.
 *
 * @param messageServer - message server host
 * @returns the responding port, or undefined
 */
async function findMessageServerHttpPort(messageServer: string): Promise<number | undefined> {
    const ranged: number[] = [];
    for (let p = MSG_SERVER_RANGE[0]; p <= MSG_SERVER_RANGE[1]; p++) {
        ranged.push(p);
    }
    // Common patterns first (deduplicated), then the rest of the bounded range.
    const candidates = [...new Set([...MSG_SERVER_COMMON_PORTS, ...ranged])];
    return firstMatch(candidates, async (port) => {
        try {
            await httpGetText(messageServer, port, '/msgserver/text/logon');
            return true;
        } catch {
            return false;
        }
    });
}

/**
 * Builds the focused, priority-ordered list of HTTPS ports for the direct brute-force fallback:
 * 443, then 44300-44399, then 50000-50099, then other common HTTPS ports.
 *
 * @returns the ordered candidate ports
 */
function focusedHttpsCandidatePorts(): number[] {
    const ports: number[] = [443];
    for (let p = 44300; p <= 44399; p++) {
        ports.push(p);
    }
    for (let p = 50000; p <= 50099; p++) {
        ports.push(p);
    }
    ports.push(8443, 8000, 8080, 80);
    return ports;
}

/**
 * Probes candidate ports concurrently (bounded) and returns the first that passes an ADT ping.
 *
 * @param host - target host
 * @param ports - candidate ports in priority order
 * @param scheme - "https" or "http"
 * @param client - SAP client for the ping
 * @returns the first verified port, or undefined
 */
async function firstVerifiedPort(
    host: string,
    ports: number[],
    scheme: 'https' | 'http',
    client?: string
): Promise<number | undefined> {
    return firstMatch(ports, (port) => verifyAdtEndpoint(host, port, scheme, client));
}

/**
 * Verifies an ABAP HTTP(S) endpoint by issuing an ADT ping and accepting any "server is there"
 * status (200/301/302/307/401/403). TLS certificate errors are ignored during verification.
 *
 * @param host - target host
 * @param port - target port
 * @param scheme - "https" or "http"
 * @param client - SAP client, added as sap-client query parameter
 * @returns true if the endpoint responded like an ABAP server
 */
async function verifyAdtEndpoint(
    host: string,
    port: number,
    scheme: 'https' | 'http',
    client?: string
): Promise<boolean> {
    const path = client ? `${ADT_PING_PATH}?sap-client=${encodeURIComponent(client)}` : ADT_PING_PATH;
    try {
        const status = await httpStatus(host, port, path, scheme);
        // Any of these means "an HTTP server (very likely the ICM) answered".
        return [200, 301, 302, 307, 308, 401, 403].includes(status);
    } catch {
        return false;
    }
}

/**
 * Builds a {@link ResolvedHttpsEndpoint} from host + port.
 *
 * @param host - host
 * @param port - port
 * @param scheme - scheme
 * @returns the endpoint descriptor
 */
function toEndpoint(host: string, port: number, scheme: 'https' | 'http'): ResolvedHttpsEndpoint {
    return { url: `${scheme}://${host}:${port}`, host, port: String(port) };
}

/**
 * Runs an async predicate over candidates with bounded concurrency and resolves with the first
 * candidate (in list order) for which the predicate is true. Cancels remaining work once found.
 *
 * @param candidates - the candidate values in priority order
 * @param predicate - async test returning true for a match
 * @returns the first matching candidate, or undefined
 */
async function firstMatch<T>(candidates: T[], predicate: (value: T) => Promise<boolean>): Promise<T | undefined> {
    let index = 0;
    let found: T | undefined;
    const worker = async (): Promise<void> => {
        while (found === undefined && index < candidates.length) {
            const current = candidates[index++];
            if (await predicate(current)) {
                found ??= current;
                return;
            }
        }
    };
    const workers = Array.from({ length: Math.min(PROBE_CONCURRENCY, candidates.length) }, () => worker());
    await Promise.all(workers);
    return found;
}

/**
 * Issues a GET (via the proxy-aware axios-extension client) and returns the response body text.
 * Rejects on non-2xx or transport error.
 *
 * @param host - host
 * @param port - port
 * @param path - request path
 * @returns the response body
 */
async function httpGetText(host: string, port: number, path: string): Promise<string> {
    const provider = create({
        baseURL: `http://${host}:${port}`,
        timeout: PROBE_TIMEOUT_MS
    });
    const response = await provider.get<string>(path, { responseType: 'text' });
    return typeof response.data === 'string' ? response.data : String(response.data);
}

/**
 * Issues a GET (via the proxy-aware axios-extension client) and resolves with the response status
 * code. TLS certificate validation is disabled (probe-only). Note that axios-extension's `create()`
 * forces `validateStatus: status < 400`, so >=400 responses (e.g. 401/403) are thrown as an
 * AxiosError carrying `response.status` — this reads the status from either the resolved response or
 * that error. Only genuine transport failures (no response at all) reject.
 *
 * @param host - host
 * @param port - port
 * @param path - request path
 * @param scheme - "https" or "http"
 * @returns the HTTP status code
 */
async function httpStatus(host: string, port: number, path: string, scheme: 'https' | 'http'): Promise<number> {
    const provider = create({
        baseURL: `${scheme}://${host}:${port}`,
        timeout: PROBE_TIMEOUT_MS,
        // Probe only: corporate/self-signed certs must not block discovery.
        ignoreCertErrors: true
    });
    try {
        const response = await provider.get(path);
        return response.status;
    } catch (err) {
        // A response-bearing error (e.g. 401/403) still means an HTTP server answered.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (typeof status === 'number') {
            return status;
        }
        // No response → genuine transport failure (connection refused, timeout, DNS, ...).
        throw err;
    }
}
