import fs from 'fs/promises';
import { omit, once } from 'lodash';
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
    let requestAndResponseList = await retrieveRecordedRequestsAndResponses(client);
    requestAndResponseList = disableRequestsSecureFlag(requestAndResponseList);
    await fs.writeFile(RESPONSES_JSON_PATH, JSON.stringify(requestAndResponseList, null, 2));
}

async function retrieveRecordedRequestsAndResponses(client: MockServerClient): Promise<HttpRequestAndHttpResponse[]> {
    return client.retrieveRecordedRequestsAndResponses({}) as Promise<HttpRequestAndHttpResponse[]>;
}

function disableRequestsSecureFlag(requestAndResponseList: HttpRequestAndHttpResponse[]): HttpRequestAndHttpResponse[] {
    return requestAndResponseList.map(({ httpRequest, httpResponse }) => ({
        httpRequest: {
            // TODO a.vasilev: Some times the settings request does not match
            // the recordings due to a changed cookie. How is this possible, sb is changing the SAP_SESSION_ID cookie in replay mode???
            ...omit(httpRequest, ['headers', 'cookies']),
            secure: false
        },
        httpResponse
    }));
}

async function getRecordClientInternal(): Promise<MockServerClient> {
    logger.info('Init mock server client.');
    const client = mockServerClient('localhost', MOCK_SERVER_PORT);
    const host = process.env.SAP_SYSTEM_HOST;
    const port = getSapSystemPort();
    await client.mockAnyResponse({
        // httpRequest: {
        //     secure: false
        // },
        httpForward: {
            // Forwards https requests to the actual sap system.
            scheme: 'HTTPS',
            host,
            port
        }
    });
    // await client.mockAnyResponse({
    //     httpRequest: {
    //         path: '/.*\\.properties'
    //     },
    //     httpForward: {
    //         scheme: 'HTTPS',
    //         host,
    //         port
    //     }
    // });
    // await client.mockAnyResponse({
    //     httpRequest: {
    //         path: '/.*\\.js'
    //     },
    //     httpForward: {
    //         scheme: 'HTTPS',
    //         host,
    //         port
    //     }
    // });
    return client;
}
