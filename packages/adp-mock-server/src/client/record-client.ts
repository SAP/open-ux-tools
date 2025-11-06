import fs from 'fs/promises';
import { once } from 'lodash';
import { mockServerClient } from 'mockserver-client';
import type { MockServerClient } from 'mockserver-client/mockServerClient';
import { MOCK_SERVER_PORT, RESPONSES_JSON_PATH } from '../constants';
import { HttpRequestAndHttpResponse } from '../types';
import { logger } from '../utils/logger';
import { getSapSystemPort } from '../utils/sap-system-utils';

export const getRecordClient = once(getRecordClientInternal);

export async function recordResponses(): Promise<void> {
    logger.info('Record responses.');
    const client = await getRecordClient();
    let requestResponseList = await retrieveRecordedRequestsAndResponses(client);
    requestResponseList = disableRequestsSecureFlag(requestResponseList);
    await fs.writeFile(RESPONSES_JSON_PATH, JSON.stringify(requestResponseList, null, 2));
}

async function retrieveRecordedRequestsAndResponses(client: MockServerClient): Promise<HttpRequestAndHttpResponse[]> {
    return client.retrieveRecordedRequestsAndResponses({}) as Promise<HttpRequestAndHttpResponse[]>;
}

function disableRequestsSecureFlag(requestResponseList: HttpRequestAndHttpResponse[]): HttpRequestAndHttpResponse[] {
    return requestResponseList.map(({ httpRequest, httpResponse }) => ({
        httpRequest: {
            ...httpRequest,
            secure: false
        },
        httpResponse
    }));
}

async function getRecordClientInternal(): Promise<MockServerClient> {
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
