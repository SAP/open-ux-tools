import dotenv from 'dotenv';
import { start_mockserver, stop_mockserver } from 'mockserver-node';
import path from 'path';
import { getRecordClient, recordRequestsAndResponses } from './client/record-client';
import { getReplayClient } from './client/replay-client';
import { EXPECTATIONS_JSON_PATH, MOCK_SERVER_PORT, RESPONSES_JSON_PATH } from './server-constants';
import { getCliParamValueByName } from './utils/cli-utils';
import { createMockDataFolderIfNeeded } from './utils/file-utils';
import { logger } from './utils/logger';
import { getSapSystemPort } from './utils/sap-system-utils';

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
    await start_mockserver({
        serverPort: MOCK_SERVER_PORT,
        // Does not support https forwarding without client https forwarding.
        proxyRemoteHost: process.env.SAP_SYSTEM_HOST,
        proxyRemotePort: getSapSystemPort(),
        jvmOptions: [
            '-Dmockserver.watchInitializationJson=true',
            `-Dmockserver.initializationJsonPath=${EXPECTATIONS_JSON_PATH}`,
            '-Dmockserver.persistExpectations=true',
            `-Dmockserver.persistedExpectationsPath=${EXPECTATIONS_JSON_PATH}`
        ]
        // verbose: true
    });
    logger.info(`✅ Server running on port ${MOCK_SERVER_PORT} in record mode.`);
    await getRecordClient();
}

async function startInReplayMode(): Promise<void> {
    await start_mockserver({
        serverPort: MOCK_SERVER_PORT,
        jvmOptions: [
            '-Dmockserver.watchInitializationJson=true',
            // We load all request/responses as expectations for the replay mode.
            `-Dmockserver.initializationJsonPath=${RESPONSES_JSON_PATH}`,
            '-Dmockserver.persistExpectations=false'
        ]
        // verbose: true
    });
    logger.info(`✅ Server running on port ${MOCK_SERVER_PORT} in replay mode.`);
    await getReplayClient();
}

async function stop(): Promise<void> {
    if (getCliParamValueByName(CLI_PARAM_RECORD)) {
        await recordRequestsAndResponses();
    }
    await stop_mockserver({ serverPort: MOCK_SERVER_PORT });
    logger.info('Stop mock server.');
}

async function main(): Promise<void> {
    if (getCliParamValueByName(CLI_PARAM_START)) {
        await start(getCliParamValueByName(CLI_PARAM_RECORD));
        // Keep alive.
        await NOOP;
    } else if (getCliParamValueByName(CLI_PARAM_STOP)) {
        await stop();
    }
}

main().catch((error) => {
    logger.error(`Unexpected error: ${error}.`);
    process.exit(1);
});
