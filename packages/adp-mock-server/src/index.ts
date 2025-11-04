import dotenv from 'dotenv';
import { start_mockserver, stop_mockserver } from 'mockserver-node';
import path from 'path';
import { getClient, recordResponses } from './client';
import {
    CLI_PARAM_RECORD,
    CLI_PARAM_START,
    CLI_PARAM_STOP,
    EXPECTATIONS_JSON_PATH,
    MOCK_SERVER_PORT,
    NOOP,
    RESPONSES_JSON_PATH
} from './constants';
import { logger } from './logger';
import { createMockDataFolderIfNeeded, getCliParamValueByName, getSapSystemPort } from './utils';

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
    await getClient();
}

async function startInReplayMode(): Promise<void> {
    await start_mockserver({
        serverPort: MOCK_SERVER_PORT,
        jvmOptions: [
            '-Dmockserver.watchInitializationJson=true',
            `-Dmockserver.initializationJsonPath=${RESPONSES_JSON_PATH}`,
            '-Dmockserver.persistExpectations=false'
        ]
        // verbose: true
    });
    logger.info(`✅ Server running on port ${MOCK_SERVER_PORT} in replay mode.`);
}

async function stop(): Promise<void> {
    if (getCliParamValueByName(CLI_PARAM_RECORD)) {
        await recordResponses();
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
