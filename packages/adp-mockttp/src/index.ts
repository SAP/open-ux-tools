import dotenv from 'dotenv';
import path from 'path';
import { getEndpoint, getProxy } from './proxy';
import { MOCK_DATA_FOLDER_PATH, MOCK_SERVER_PORT } from './server-constants';
import { getCliParamValueByName } from './utils/cli-utils';
import { createMockDataFolderIfNeeded } from './utils/file-utils';
import { logger } from './utils/logger';
import { getSapSystemPort } from './utils/sap-system-utils';
import fs from 'fs';
import { CompletedRequest, Request } from 'mockttp';
import { getReplayServer } from './replay-server';

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
        reqMap.set(req.id, req);
    });

    const responsesStream = fs.createWriteStream(`${MOCK_DATA_FOLDER_PATH}/responses.json`, { flags: 'w' });
    responsesStream.write('[\n');
    await proxy.on('response', async (response) => {
        const req = reqMap.get(response.id);
        logger.info(`[<=] ${req?.path}`);
        responsesStream.write(
            JSON.stringify({
                httpRequest: {
                    path: req?.path,
                    method: req?.method,
                    body: await req?.body.getText(),
                    headers: req?.headers
                },
                httpResponse: {
                    headers: response.headers,
                    statusCode: response.statusCode,
                    body: await response.body.getText()
                }
            }) + ',\n'
        );
    });

    process.on('SIGINT', async () => {
        responsesStream.end(']');
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
