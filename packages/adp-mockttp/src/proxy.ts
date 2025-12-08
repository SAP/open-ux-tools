import { once } from 'lodash';
import { getLocal, generateCACertificate, Mockttp, MockedEndpoint } from 'mockttp';
import { MOCK_SERVER_PORT } from './server-constants';
import { getSapSystemPort } from './utils/sap-system-utils';

export const getProxy = once(getProxyInternal);

export const getEndpoint = once(getEndpointInternal);

async function getProxyInternal(): Promise<Mockttp> {
    const https = await generateCACertificate();
    const proxy = getLocal({ /*https,*/ recordTraffic: true, maxBodySize: 1024 * 1024 * 1024 });
    return proxy;
}

async function getEndpointInternal(): Promise<MockedEndpoint> {
    const proxy = await getProxy();
    // return proxy.forAnyRequest().thenPassThrough({
    //     beforeRequest: async (req) => {
    //         const rewrittenUrl = req.url.replace(
    //             `http://localhost:${MOCK_SERVER_PORT}`,
    //             `https://${process.env.SAP_SYSTEM_HOST}:${getSapSystemPort()}`
    //         );

    //         const body =
    //             req.headers['content-type'] === 'application/zip'
    //                 ? (await req.body.getDecodedBuffer())?.toString('base64')
    //                 : req.body.buffer;

    //         return { url: rewrittenUrl, body };
    //     },
    //     ignoreHostHttpsErrors: true
    // });
    return proxy
        .forAnyRequest()
        .thenForwardTo(`https://${process.env.SAP_SYSTEM_HOST}:${getSapSystemPort()}`, { ignoreHostHttpsErrors: true });
}
