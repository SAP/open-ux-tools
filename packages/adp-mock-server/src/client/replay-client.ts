import { once } from 'lodash';
import { mockServerClient, MockServerClient } from 'mockserver-client/mockServerClient';
import { MOCK_SERVER_PORT } from '../constants';
import { Body, HttpRequestAndHttpResponse } from '../types';
import { logger } from '../utils/logger';
import { isBinaryBody, isBodyType, isXmlBody } from '../utils/type-guards';
import { Expectation, HttpRequest } from 'mockserver-client';

export const getReplayClient = once(getReplayClientInternal);

async function getReplayClientInternal(): Promise<MockServerClient> {
    logger.info('Init mock server client.');
    const client = mockServerClient('localhost', MOCK_SERVER_PORT);
    // await patchActiveExpectations(client);
    return client;
}

async function patchActiveExpectations(client: MockServerClient): Promise<void> {
    const requestResponseList = await retrieveActiveExpectations(client);
    const mockPromises = requestResponseList
        .filter(({ httpRequest, httpResponse }) => isBodyType(httpRequest?.body) || isBodyType(httpResponse?.body))
        .map(({ httpRequest, httpResponse }) => ({
            httpRequest: {
                ...httpRequest,
                body: parseBody(httpRequest?.body)
            },
            httpResponse: {
                ...httpResponse,
                body: parseBody(httpResponse?.body)
            }
        }))
        .map(({ httpRequest, httpResponse }) => client.clear(httpRequest as HttpRequest, 'EXPECTATIONS'));
    await Promise.all(mockPromises);
    logger.info(mockPromises);
}

async function retrieveActiveExpectations(client: MockServerClient): Promise<HttpRequestAndHttpResponse[]> {
    return client.retrieveActiveExpectations({}) as Promise<HttpRequestAndHttpResponse[]>;
}

function parseBody(body: unknown): Body | string | unknown {
    if (!isBodyType(body)) {
        return body;
    }

    if (isXmlBody(body)) {
        return body.xml;
    }

    if (isBinaryBody(body)) {
        return body.base64Bytes;
    }

    return body;
}
