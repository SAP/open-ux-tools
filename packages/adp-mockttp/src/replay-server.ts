import fs from 'fs';
import { once } from 'lodash';
import { CompletedRequest, getLocal, Mockttp } from 'mockttp';
import path from 'path';
import { logger } from './utils/logger';

interface RecordedInteraction {
    httpRequest: {
        path: string;
        method: string;
        headers?: Record<string, string>;
        body?: any;
        queryStringParameters?: Record<string, string>;
    };
    httpResponse: {
        statusCode: number;
        headers?: Record<string, string>;
        body?: any;
    };
}

export const getReplayServer = once(getReplayServerInternal);

async function getReplayServerInternal(): Promise<Mockttp> {
    const server = getLocal({ debug: true });

    const interactions: RecordedInteraction[] = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '..', 'mock-data', 'responses.json'), 'utf8')
    );

    /*
    // Group by method + path + query + body
    const groups = new Map<string, RecordedInteraction[]>();

    for (const item of interactions) {
        const key = buildGroupingKey(item.httpRequest);

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(item);
    }

    // Register mocks
    for (const group of groups.values()) {
        const firstReq = group[0].httpRequest;

        const method = firstReq.method.toUpperCase();
        const expectedPath = firstReq.path;
        const expectedQuery = normalizeQuery(firstReq.queryStringParameters || {});
        const expectedBody = normalizeBody(firstReq.body);

        let index = 0;

        logger.info(`Registering mock for: ${method} ${expectedPath} ${expectedQuery} (${group.length} calls)`);

        await server
            .forAnyRequest()
            .matching(async (req: CompletedRequest) => {
                if (req.method !== method) return false;
                if (decodeURIComponent(req.path) !== `${expectedPath}${expectedQuery ? `?${expectedQuery}` : ''}`)
                    return false;

                // Match body
                const bodyText = await req.body.getText();
                const reqBody = normalizeBody(bodyText);
                if (reqBody !== expectedBody) return false;

                logger.info(`We have a match ${req.method} ${req.path}`);

                return true;
            })
            .thenCallback(async () => {
                let entry = group[index];

                if (!entry) {
                    return {
                        statusCode: 500,
                        body: `No more recorded responses for ${method} ${expectedPath}`
                    };
                    // entry = group[group.length - 1];
                }

                index++;

                return {
                    statusCode: entry.httpResponse.statusCode,
                    // headers: entry.httpResponse.headers,
                    body: entry.httpResponse.body
                };
            });
            
    }*/

    // Store all responses as sequential queues
    const responseQueues = new Map<string, RecordedInteraction[]>();

    for (const item of interactions) {
        const key = buildGroupingKey(item.httpRequest);
        if (!responseQueues.has(key)) responseQueues.set(key, []);
        responseQueues.get(key)!.push(item);
    }

    // ONE matcher + ONE handler for ALL requests
    await server
        .forAnyRequest()
        .matching(async (req: CompletedRequest) => {
            // const key = buildKey(req.method, req.path, req.query, req.body.text);
            const key = buildGroupingKey2(req);

            return responseQueues.has(key) && responseQueues.get(key)!.length > 0;
        })
        .thenCallback(async (req: CompletedRequest) => {
            const key = buildGroupingKey2(req);

            const queue = responseQueues.get(key);

            if (!queue || queue.length === 0) {
                return {
                    statusCode: 500,
                    body: `No recorded responses left for: ${key}`
                };
            }

            // FIFO: consume responses sequentially
            const interaction = queue.shift()!;

            const body =
                (interaction.httpResponse.headers ?? {})['content-type'] === 'image/jpeg'
                    ? Buffer.from(interaction.httpResponse.body, 'base64')
                    : interaction.httpResponse.body;

            return {
                statusCode: interaction.httpResponse.statusCode,
                // TODO if I send headers then request matching is broken why?? i dont
                // match headers. May be some resources are loaded from cache and then a request does not
                // went through mockttp replay server.
                // headers: interaction.httpResponse.headers,
                /**
                 * 🔥 Real-world example with SAP UI5

When you return these headers:

{
  "x-csrf-token": "abc123",
  "set-cookie": "SAP_SESSIONID=xyz",
  "sap-cache-control": "+0",
  "sap-contextid": "...",
  "cache-control": "no-cache"
}


the browser automatically:

updates the cookie

updates the CSRF token sent in the header

changes the order of headers

adds If-None-Match or If-Modified-Since

reloads from cache instead of issuing a request

UI5 runtime adds dynamic params (like sap-language, sap-client, sap-theme)

some requests may not even be triggered because the browser thinks it is cached

So the next request becomes different from the originally recorded request.
                 */
                body
            };
        });

    return server;
}

function normalizeQuery(q: Record<string, string> = {}) {
    return Object.keys(q)
        .sort()
        .map((k) => `${k}=${q[k]}`)
        .join('&');
}

function normalizeBody(body: any) {
    if (!body) return '';
    if (typeof body === 'string') return body;
    return JSON.stringify(body);
}
// TODO include body here the tuple method, path, query, body is used to make a request unique. Is this ok? What about same tuple different headers or cookies?
function buildGroupingKey(req: RecordedInteraction['httpRequest']) {
    const method = req.method.toUpperCase();
    const path = req.path;
    const query = normalizeQuery(req.queryStringParameters || {});
    const body = normalizeBody(req.body);

    return `${method} ${path}?${query}`;
}
// TODO include body here the tuple method, path, query, body is used to make a request unique. Is this ok? What about same tuple different headers or cookies?
function buildGroupingKey2(req: CompletedRequest) {
    const method = req.method.toUpperCase();
    const url = new URL(req.path, 'http://dummy.com');
    const path = url.pathname;
    const query = normalizeQuery(Object.fromEntries(url.searchParams.entries()));
    const body = normalizeBody(req.body);

    return `${method} ${path}?${query}`;
}
