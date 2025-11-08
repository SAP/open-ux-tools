import { isEqual, once } from 'lodash';
import { HttpRequest, HttpResponse } from 'mockserver-client';
import { mockServerClient, MockServerClient } from 'mockserver-client/mockServerClient';
import { MOCK_SERVER_PORT } from '../server-constants';
import { Expectation } from '../types';
import { normalizeZipFileContent } from '../utils/file-utils';
import { HashMap, HashMapKeyComparator } from '../utils/hash-map';
import { HashSet } from '../utils/hash-set';
import { logger } from '../utils/logger';
import { isZipBody } from '../utils/type-guards';

const NOT_FOUND_RESPONSE: HttpResponse = {
    statusCode: 404,
    reasonPhrase: '[ADP] Not found.'
};

type RequestMatcher = Pick<HttpRequest, 'path' | 'method'>;

const zipRequestsComparator: HashMapKeyComparator<HttpRequest> = (requestA, requestB) =>
    requestA.path === requestB.path &&
    requestA.method === requestB.method &&
    isEqual(requestA.queryStringParameters, requestB.queryStringParameters) &&
    isZipBodyEqualWith(requestA.body, requestB.body);

const isZipBodyEqualWith = (aBody: unknown, bBody: unknown) => {
    if (!isZipBody(aBody) || !isZipBody(bBody)) {
        return false;
    }
    const aBodyBuffer = Buffer.from(aBody.base64Bytes, 'base64');
    const bBodyBuffer = Buffer.from(bBody.base64Bytes, 'base64');
    return normalizeZipFileContent(aBodyBuffer) === normalizeZipFileContent(bBodyBuffer);
};

const requestMatcherComparator = (matcherA: RequestMatcher, matcherB: RequestMatcher) =>
    matcherA.path === matcherB.path && matcherA.method === matcherB.method;

export const getReplayClient = once(getReplayClientInternal);

async function getReplayClientInternal(): Promise<MockServerClient> {
    logger.info('Init mock server client.');
    const client = mockServerClient('localhost', MOCK_SERVER_PORT);
    await patchZipRequestsAndResponses(client);
    return client;
}

async function patchZipRequestsAndResponses(client: MockServerClient): Promise<void> {
    const expectationsList = await retrieveActiveExpectations(client);
    const zipExpectationsList = expectationsList.filter(({ httpRequest }) => isZipBody(httpRequest?.body));
    const zipResponsesByRequestMap = new HashMap<HttpRequest, HttpResponse[]>(zipRequestsComparator);
    zipExpectationsList.forEach(({ httpRequest, httpResponse }) => {
        if (!httpRequest || !httpResponse) {
            return;
        }
        if (zipResponsesByRequestMap.has(httpRequest)) {
            zipResponsesByRequestMap.get(httpRequest)?.push(httpResponse);
        } else {
            zipResponsesByRequestMap.set(httpRequest, [httpResponse]);
        }
    });
    const zipRequestMatcherSet = new HashSet<RequestMatcher>(requestMatcherComparator);
    const zipRequestMatcherList = Array.from(zipResponsesByRequestMap.keys()).map(({ path, method }) => ({
        path,
        method
    }));
    zipRequestMatcherList.forEach((matcher) => {
        zipRequestMatcherSet.add(matcher);
    });
    const zipResponseIteratorsByRequestMap = zipResponsesByRequestMap.map(
        ([httpRequest, httpResponses]) => [httpRequest, httpResponses.values()],
        zipRequestsComparator
    );

    await Promise.all(
        zipRequestMatcherSet.values().map((matcher) =>
            client.mockWithCallback(
                matcher,
                (httpRequest) => {
                    if (!zipResponseIteratorsByRequestMap.has(httpRequest)) {
                        return NOT_FOUND_RESPONSE;
                    }
                    const httpResponsesIterator = zipResponseIteratorsByRequestMap.get(httpRequest);
                    const nextResponse = httpResponsesIterator?.next().value;
                    return nextResponse ?? NOT_FOUND_RESPONSE;
                },
                { unlimited: true }
            )
        )
    );
}

async function retrieveActiveExpectations(client: MockServerClient): Promise<Expectation[]> {
    return client.retrieveActiveExpectations({}) as Promise<Expectation[]>;
}
