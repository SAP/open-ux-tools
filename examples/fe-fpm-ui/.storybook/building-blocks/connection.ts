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
import { getProjectPath, testAppPath } from '../addons/project';
import { handleAction as handleAddonAction } from '../addons/actions';
import { AddonActions } from '../addons/types';

const sampleAppPath = join(__dirname, '../../../fe-fpm-cli/sample/fe-app');

let fsEditor: Editor | undefined;
let connections: WebSocket[] = [];

/**
 * Initializes the memfs and copies over the sample Fiori elements application.
 *
 * @returns {Promise<Editor>} the memfs editor object
 */
export async function getEditor(forceUpdate = false): Promise<Editor> {
    if (fsEditor && !forceUpdate) {
        return fsEditor;
    }
    fsEditor = create(createStorage());

    if (testAppPath === getProjectPath()) {
        fsEditor.copy([join(sampleAppPath)], join(testAppPath));
    }

    await promisify(fsEditor.commit).call(fsEditor);
    return fsEditor;
}

export async function createWebSocketConnection(): Promise<void> {
    const wss = new WebSocket.Server({ port: 8080 });

    // Listen for WebSocket connections
    wss.on('connection', async (ws: WebSocket) => {
        // Store active connection
        connections.push(ws);
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

function sendMessage(action: Actions): void {
    if (!connections.length) {
        return;
    }
    for (const connection of connections) {
        connection.send(JSON.stringify(action));
    }
}

export const validateProject = async (): Promise<string | undefined> => {
    try {
        const fs = await getEditor(true);
        const currentAppPath = getProjectPath();
        // Call API to get table questions - it should validate of path is supported
        const questions = await getTableBuildingBlockPrompts(currentAppPath, fs);
        const entityQuestion = questions.find((question) => question.name === 'entity');
        if (entityQuestion && 'choices' in entityQuestion && typeof entityQuestion.choices === 'function') {
            await entityQuestion.choices();
        }
    } catch (e) {
        return `Error: ${e.message || e}`;
    }
};

async function handleAction(action: Actions): Promise<void> {
    let fs = await getEditor();
    const currentAppPath = getProjectPath();
    switch (action.type) {
        case GET_QUESTIONS: {
            let responseAction: Actions | undefined;
            if (action.value === SupportedBuildingBlocks.Table) {
                const prompts = await getTableBuildingBlockPrompts(currentAppPath, fs);
                // Post processing
                responseAction = { type: SET_TABLE_QUESTIONS, questions: prompts };
            } else if (action.value === SupportedBuildingBlocks.Chart) {
                const prompts = await getChartBuildingBlockPrompts(currentAppPath, fs);
                // Post processing
                responseAction = { type: SET_CHART_QUESTIONS, questions: prompts };
            } else if (action.value === SupportedBuildingBlocks.FilterBar) {
                const prompts = await getFilterBarBuildingBlockPrompts(currentAppPath, fs);
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
            const choices = await getBuildingBlockChoices(buildingBlockType as any, name, answers, currentAppPath);

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
            const _fs = fpmWriterApi(buildingBlockType as any, answers as any, currentAppPath, fs);
            console.log(currentAppPath);
            await promisify(_fs.commit).call(_fs);
            const responseAction: ResetAnswers = {
                type: RESET_ANSWERS,
                buildingBlockType
            };
            sendMessage(responseAction);
            break;
        }
    }
    // Handle addon actions
    const addonResponseAction = await handleAddonAction(action as AddonActions);
    if (addonResponseAction) {
        sendMessage(addonResponseAction);
    }
}
