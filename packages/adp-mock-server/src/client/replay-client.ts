import { once } from 'lodash';
import { Expectation, HttpRequest, HttpResponse } from 'mockserver-client';
import { mockServerClient, MockServerClient } from 'mockserver-client/mockServerClient';
import { MOCK_SERVER_PORT } from '../constants';
import { logger } from '../utils/logger';
import { isBinaryBody } from '../utils/type-guards';
import { normalizeZipBody } from '../utils/file-utils';

const NOT_FOUND_RESPONSE: HttpResponse = {
    statusCode: 404,
    reasonPhrase: '[ADP] Not found.'
};

export const getReplayClient = once(getReplayClientInternal);

async function getReplayClientInternal(): Promise<MockServerClient> {
    logger.info('Init mock server client.');
    const client = mockServerClient('localhost', MOCK_SERVER_PORT);
    await patchRequestsWithBinaryBody(client);
    return client;
}

async function patchRequestsWithBinaryBody(client: MockServerClient): Promise<void> {
    const requestResponseList = await retrieveActiveExpectations(client);
    const requestWithBinaryBodyResponseList = requestResponseList.filter(({ httpRequest }) =>
        isBinaryBody((httpRequest as HttpRequest).body)
    );
    const uniqueRequestPaths = new Set(
        requestWithBinaryBodyResponseList.map(({ httpRequest }) => (httpRequest as HttpRequest).path)
    );
    await Promise.all(
        Array.from(uniqueRequestPaths).map((path) =>
            client.mockWithCallback(
                { path },
                (requst) => {
                    if (requst.path !== path || !isBinaryBody(requst.body)) {
                        return NOT_FOUND_RESPONSE;
                    }

                    const expectation = requestWithBinaryBodyResponseList.find(
                        (expectation) => (expectation.httpRequest as HttpRequest).path === path
                    );

                    if (!expectation) {
                        return NOT_FOUND_RESPONSE;
                    }

                    const expectedRequest = expectation.httpRequest as HttpRequest;

                    if (!isBinaryBody(expectedRequest.body)) {
                        return NOT_FOUND_RESPONSE;
                    }

                    const receivedRequestBuffer = Buffer.from(requst.body.base64Bytes, 'base64');
                    const expectedRequestBuffer = Buffer.from(expectedRequest.body.base64Bytes, 'base64');

                    if (normalizeZipBody(expectedRequestBuffer) === normalizeZipBody(receivedRequestBuffer)) {
                        return expectation.httpResponse!;
                    }

                    return NOT_FOUND_RESPONSE;
                },
                { unlimited: true } // TODO a.vasilev: [optimization] add id param to the mockWithCallback to override
                // the request from recorded file to reduce the failing attempts.
            )
        )
    );
}

async function retrieveActiveExpectations(client: MockServerClient): Promise<Expectation[]> {
    return client.retrieveActiveExpectations({});
}
