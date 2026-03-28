import { omit, once } from 'lodash';
import { getLocal, generateCACertificate, Mockttp, MockedEndpoint } from 'mockttp';
import { MOCK_DATA_FOLDER_PATH, MOCK_SERVER_PORT, RESPONSES_JSON_PATH } from './server-constants';
import { getSapSystemPort, isBtpEnvironment } from './utils/sap-system-utils';
import { executeHttpRequest, Method } from '@sap-cloud-sdk/http-client';
import { getDestination } from '@sap-cloud-sdk/connectivity';
import { logger } from './utils/logger';
import path from 'path';
import fs from 'fs';

export const getProxy = once(getProxyInternal);

export const getEndpoint = once(getEndpointInternal);

async function getProxyInternal(): Promise<Mockttp> {
    const https = await generateCACertificate();
    const proxy = getLocal({ /*https,*/ recordTraffic: true, maxBodySize: 1024 * 1024 * 1024 });

    if (!isBtpEnvironment()) {
        return proxy;
    }

    const destinationName = process.env.SAP_DESTINATION || '';
    const destination = await getDestination({
        destinationName
    });

    logger.info('Destination: ' + JSON.stringify(destination, null, 2));

    await initRoutes(proxy);

    return proxy;
}

async function initRoutes(proxy: Mockttp): Promise<void> {
    await proxy
        .forGet('/adp-download')
        .times(Infinity)
        .thenCallback(async () => {
            const responsesPath = path.join(process.cwd(), RESPONSES_JSON_PATH);
            const file = fs.readFileSync(responsesPath);

            return {
                statusCode: 200,
                headers: {
                    'content-type': 'application/json',
                    'content-disposition': 'attachment; filename="responses.json"'
                },
                body: file
            };
        });
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

    if (!isBtpEnvironment()) {
        return proxy.forAnyRequest().thenForwardTo(`https://${process.env.SAP_SYSTEM_HOST}:${getSapSystemPort()}`, {
            ignoreHostHttpsErrors: true,
            transformResponse: {
                updateHeaders: {
                    'cache-control': undefined,
                    'etag': undefined,
                    'expires': undefined,
                    'last-modified': undefined,
                    'pragma': undefined
                }
            }
        });
    }

    const destinationName = process.env.SAP_DESTINATION || '';
    logger.info(`Destination name: ${destinationName} ${typeof destinationName}`);
    return proxy.forAnyRequest().thenCallback(async (req) => {
        logger.info(`[=>] ${req.method} ${req.path}`);
        const response = await executeHttpRequest(
            { destinationName },
            {
                method: req.method as Method,
                url: req.path,
                data: req.body
            }
        );

        const body =
            typeof response.data === 'string' || Buffer.isBuffer(response.data)
                ? response.data
                : JSON.stringify(response.data);

        return {
            statusCode: response.status,
            body,
            headers: omit(response.headers, [
                // disable cache
                'cache-control',
                'etag',
                'expires',
                'last-modified',
                'pragma',
                // original content lenthg of the response is not correct since we modify the body
                'content-length',
                /**
                 * Is backend returning gzip? If yes: axios may decompress but headers
                 * still say content-encoding: gzip
                 *
                 * mismatch → broken body
                 */
                'content-encoding'
            ])
        };
    });
}
