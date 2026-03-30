import { omit, once } from 'lodash';
import { getLocal, generateCACertificate, Mockttp, MockedEndpoint, CompletedRequest } from 'mockttp';
import { MOCK_DATA_FOLDER_PATH, MOCK_SERVER_PORT, RESPONSES_JSON_PATH } from './server-constants';
import { getSapSystemPort, isBtpEnvironment } from './utils/sap-system-utils';
import { executeHttpRequest, Method } from '@sap-cloud-sdk/http-client';
import { getDestination } from '@sap-cloud-sdk/connectivity';
import { logger } from './utils/logger';
import path from 'path';
import fs from 'fs';
import { getStorage } from './storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';

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

    logger.info(`Destination: ${JSON.stringify(destination)}`);

    await initBtpRoutes(proxy);

    return proxy;
}

async function initBtpRoutes(proxy: Mockttp): Promise<void> {
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

    await proxy
        .forGet(/^\/adp-upload\/[^/]+\/[^/]+\.json$/)
        .times(Infinity)
        .thenCallback(async (req) => {
            // Extract params from regex match
            const match = req.url.match(/\/adp-upload\/([^/]+)\/([^/]+)/);
            if (!match) {
                return {
                    statusCode: 400,
                    body: 'Invalid path, expected /adp-upload/:testName/:fileName'
                };
            }

            const testName = match[1];
            const fileName = match[2];

            logger.info(`Upload: ${testName} ${fileName}`);

            const responsesPath = path.join(process.cwd(), RESPONSES_JSON_PATH);
            const file = fs.readFileSync(responsesPath);

            const { storage, bucket } = await getStorage();

            await storage?.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: `${testName}/${fileName}`,
                    Body: file.toString('utf-8'),
                    ContentType: 'application/json'
                })
            );

            return {
                statusCode: 200,
                body: 'Uploaded'
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
        const isZipFile = req.headers['content-type'] === 'application/zip';
        const response = await executeHttpRequest(
            { destinationName },
            {
                method: req.method as Method,
                url: req.path,
                data: isZipFile ? req.body.buffer : req.body,
                ...(isZipFile
                    ? {
                          'Content-Type': 'application/zip',
                          'Content-Length': req.body.buffer.length
                      }
                    : {})
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
