import { once } from 'lodash';
import { getLocal, generateCACertificate, Mockttp, MockedEndpoint } from 'mockttp';
import { MOCK_SERVER_PORT } from './server-constants';
import { getSapSystemPort } from './utils/sap-system-utils';

export const getProxy = once(getProxyInternal);

export const getEndpoint = once(getEndpointInternal);

async function getProxyInternal(): Promise<Mockttp> {
    const https = await generateCACertificate();
    const proxy = getLocal({ /*https,*/ recordTraffic: true });
    return proxy;
}

async function getEndpointInternal(): Promise<MockedEndpoint> {
    const proxy = await getProxy();
    return proxy.forAnyRequest().thenPassThrough({
        beforeRequest: (req) => {
            const rewrittenUrl = req.url.replace(
                `http://localhost:${MOCK_SERVER_PORT}`,
                `https://${process.env.SAP_SYSTEM_HOST}:${getSapSystemPort()}`
            );

            return { url: rewrittenUrl };
        },
        ignoreHostHttpsErrors: true
    });
}
