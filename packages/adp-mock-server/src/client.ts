import fs from 'fs/promises';
import { once } from 'lodash';
import { mockServerClient } from 'mockserver-client';
import type { HttpRequest, HttpResponse } from 'mockserver-client/mockServer';
import type { MockServerClient } from 'mockserver-client/mockServerClient';
import { MOCK_SERVER_PORT, RESPONSES_JSON_PATH } from './constants';
import { logger } from './logger';
import { getSapSystemPort } from './utils';

/**
 * In type HttpRequestAndHttpResponse, httpRequest and httpResponse fields are not arrays but objects.
 * TODO Add .d.ts in types folder to patch the type.
 */
interface RequestAndResponsePatched {
    httpRequest?: HttpRequest;
    httpResponse?: HttpResponse;
    timestamp?: string;
}

export const getClient = once(getClientInternal);

export async function recordResponses(): Promise<void> {
    logger.info('Record responses.');
    const client = await getClient();
    let requestResponseList = (await client.retrieveRecordedRequestsAndResponses(
        {}
    )) as unknown as RequestAndResponsePatched[];
    requestResponseList = postProcessRequestAndResponses(requestResponseList);
    await fs.writeFile(RESPONSES_JSON_PATH, JSON.stringify(requestResponseList, null, 2));
}

async function getClientInternal(): Promise<MockServerClient> {
    logger.info('Init mock server client.');
    const client = mockServerClient('localhost', MOCK_SERVER_PORT);
    await client.mockAnyResponse({
        httpRequest: {
            secure: false
        },
        httpForward: {
            // Forwards https requests to the actual sap system.
            scheme: 'HTTPS',
            host: process.env.SAP_SYSTEM_HOST,
            port: getSapSystemPort()
        }
    });
    return client;
}

function postProcessRequestAndResponses(requestResponseList: RequestAndResponsePatched[]): RequestAndResponsePatched[] {
    return requestResponseList.map(({ httpRequest, httpResponse }) => {
        const body = httpRequest?.body as any;
        return {
            httpRequest: {
                ...httpRequest,
                body: body?.type === 'BINARY' ? body.base64Bytes : body,
                secure: false
            },
            httpResponse
        };
    });
}
