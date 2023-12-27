import { join } from 'path';
import {
    getTableBuildingBlockPrompts,
    getChartBuildingBlockPrompts,
    getFilterBarBuildingBlockPrompts,
    getBuildingBlockChoices
} from '@sap-ux/fe-fpm-writer';
import { promisify } from 'util';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import WebSocket from 'ws';
import type { Data } from 'ws';
import {
    GET_QUESTIONS,
    SET_TABLE_QUESTIONS,
    SET_CHART_QUESTIONS,
    SET_FILTERBAR_QUESTIONS,
    SupportedBuildingBlocks,
    GET_CHOICES,
    SET_CHOICES,
    APPLY_ANSWERS,
    RESET_ANSWERS
} from '../../stories/utils/types';
import type { Actions, ResetAnswers, SetChoices } from '../../stories/utils/types';
import { fpmWriterApi } from './writerApi';

const sampleAppPath = join(__dirname, '../../../fe-fpm-cli/sample/fe-app');
const testAppPath = join(__dirname, '../../../fe-fpm-cli/test-output/fe-app', `${Date.now()}`);

let fsEditor: Editor | undefined;
let connection: WebSocket | undefined;

/**
 * Initializes the memfs and copies over the sample Fiori elements application.
 *
 * @returns {Promise<Editor>} the memfs editor object
 */
async function getEditor(): Promise<Editor> {
    if (fsEditor) {
        return fsEditor;
    }
    fsEditor = create(createStorage());

    fsEditor.copy([join(sampleAppPath)], join(testAppPath));

    await promisify(fsEditor.commit).call(fsEditor);
    return fsEditor;
}

export async function createWebSocketConnection(): Promise<void> {
    const wss = new WebSocket.Server({ port: 8080 });

    // Listen for WebSocket connections
    wss.on('connection', async (ws: WebSocket) => {
        // Store active connection
        connection = ws;
        //Handle initialization
        console.log('WebSocket connection created');
        // Handle messages received from the preview
        ws.on('message', async (message: Data) => {
            console.log(`Received message from the storybook preview: ${message}`);
            try {
                const action: Actions = JSON.parse(message.toString());
                await handleAction(action);
            } catch (error) {
                // do nothing
            }
        });
    });
}

export function sendMessage(action: Actions): void {
    if (!connection) {
        return;
    }
    connection.send(JSON.stringify(action));
}

async function handleAction(action: Actions): Promise<void> {
    const fs = await getEditor();
    switch (action.type) {
        case GET_QUESTIONS: {
            let responseAction: Actions | undefined;
            if (action.value === SupportedBuildingBlocks.Table) {
                const prompts = await getTableBuildingBlockPrompts(testAppPath, fs);
                // Post processing
                responseAction = { type: SET_TABLE_QUESTIONS, questions: prompts };
            } else if (action.value === SupportedBuildingBlocks.Chart) {
                const prompts = await getChartBuildingBlockPrompts(testAppPath, fs);
                // Post processing
                responseAction = { type: SET_CHART_QUESTIONS, questions: prompts };
            } else if (action.value === SupportedBuildingBlocks.FilterBar) {
                const prompts = await getFilterBarBuildingBlockPrompts(testAppPath, fs);
                // Post processing
                responseAction = { type: SET_FILTERBAR_QUESTIONS, questions: prompts };
            }
            if (responseAction) {
                sendMessage(responseAction);
            }
            break;
        }
        case GET_CHOICES: {
            const { name, buildingBlockType, answers } = action;
            const choices = await getBuildingBlockChoices(buildingBlockType, name, answers, testAppPath);

            const responseAction: SetChoices = {
                type: SET_CHOICES,
                name,
                choices
            };
            sendMessage(responseAction);
            break;
        }
        case APPLY_ANSWERS: {
            const { answers, buildingBlockType /* projectRoot */ } = action;
            const _fs = fpmWriterApi(buildingBlockType as any, answers as any, testAppPath, fs);
            console.log(testAppPath);
            await promisify(_fs.commit).call(_fs);
            const responseAction: ResetAnswers = {
                type: RESET_ANSWERS,
                buildingBlockType
            };
            sendMessage(responseAction);
            break;
        }
    }
}
