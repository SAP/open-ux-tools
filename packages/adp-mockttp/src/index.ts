import dotenv from 'dotenv';
import path from 'path';
import { getEndpoint, getProxy } from './proxy';
import { MOCK_DATA_FOLDER_PATH, MOCK_SERVER_PORT } from './server-constants';
import { getCliParamValueByName } from './utils/cli-utils';
import { createMockDataFolderIfNeeded, normalizeZipFileContent } from './utils/file-utils';
import { logger } from './utils/logger';
import { getSapSystemPort } from './utils/sap-system-utils';
import fs from 'fs';
import { CompletedRequest, Request } from 'mockttp';
import { getReplayServer } from './replay-server';
import AdmZip from 'adm-zip';

const CLI_PARAM_START = 'start';
const CLI_PARAM_STOP = 'stop';
const CLI_PARAM_RECORD = 'record';
const NOOP = new Promise(() => {});

dotenv.config({ path: path.join(__dirname, '../.env') });

async function start(isRecordOrReplayMode: boolean): Promise<void> {
    await createMockDataFolderIfNeeded();
    if (isRecordOrReplayMode) {
        await startInRecordMode();
    } else {
        await startInReplayMode();
    }
}

async function startInRecordMode(): Promise<void> {
    logger.info(`✅ Server running on port ${MOCK_SERVER_PORT} in record mode.`);
    const proxy = await getProxy();
    await proxy.start(MOCK_SERVER_PORT);
    await getEndpoint();

    const reqMap = new Map<string, CompletedRequest>();
    await proxy.on('request', (req) => {
        if (req?.headers['content-type'] === 'application/zip') {
            // const zipToString = normalizeZipFileContent(req.body.buffer);
            // logger.info(zipToString + ' ' + req.body.buffer.length / (1024 * 1024));
            const zip = new AdmZip(req.body.buffer);
            const manifestEntry = zip.getEntry('manifest.appdescr_variant');
            if (manifestEntry) {
                logger.info(manifestEntry.getData().toString());
            }
        }
        reqMap.set(req.id, req);
    });

    const responsesStream = fs.createWriteStream(`${MOCK_DATA_FOLDER_PATH}/responses.json`, { flags: 'w' });
    responsesStream.write('[\n');
    let isFirstResposne = true;
    await proxy.on('response', async (response) => {
        const req = reqMap.get(response.id);
        logger.info(`[<=] ${req?.path}`);
        const url = new URL(req?.path ?? '', 'http://dummy.com');
        const responseDelimiter = isFirstResposne ? '' : ',\n';
        isFirstResposne = false;

        // TODO this probably is not needed test with editor and appdescr_ endpoint
        const reqBody =
            req?.headers['content-type'] === 'application/zip'
                ? req.body.buffer.toString('base64')
                : await req?.body.getText();

        // TODO: images still do not appear when we start the editor
        const resBody =
            response.headers['content-type'] === 'image/jpeg'
                ? response.body.buffer.toString('base64')
                : await response.body.getText();

        responsesStream.write(
            responseDelimiter +
                JSON.stringify({
                    httpRequest: {
                        path: url.pathname,
                        method: req?.method,
                        // TODO include the body in the reply matchers
                        body: reqBody,
                        headers: req?.headers,
                        queryStringParameters: Object.fromEntries(url.searchParams.entries())
                    },
                    httpResponse: {
                        headers: response.headers,
                        statusCode: response.statusCode,
                        // TODO parse the body as string or buffer or leave it as text, not sure.
                        body: resBody
                    }
                })
        );
    });

    process.on('SIGINT', async () => {
        responsesStream.end(']');
        process.exit(0);
    });
}

async function startInReplayMode(): Promise<void> {
    logger.info(`✅ Server running on port ${MOCK_SERVER_PORT} in replay mode.`);
    const server = await getReplayServer();
    await server.start(MOCK_SERVER_PORT);
}

async function stop(): Promise<void> {
    if (getCliParamValueByName(CLI_PARAM_RECORD)) {
        // const endpoint = await getEndpoint();
        // const requests = await endpoint.getSeenRequests();
        logger.info('Record responses.');
    }
    logger.info('Stop mock server.');
    const proxy = await getProxy();
    await proxy.stop();
}

async function main(): Promise<void> {
    if (getCliParamValueByName(CLI_PARAM_START)) {
        await start(getCliParamValueByName(CLI_PARAM_RECORD));
        // Keep alive.
        // await NOOP;
    } else if (getCliParamValueByName(CLI_PARAM_STOP)) {
        await stop();
    }
}

main().catch((error) => {
    logger.error(`Unexpected error: ${error}.`);
    process.exit(1);
});
