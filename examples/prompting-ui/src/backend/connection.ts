import { join } from 'path';
import { PromptsAPI } from '@sap-ux/fe-fpm-writer';
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
    RESET_ANSWERS,
    UPDATE_CODE_SNIPPET,
    UpdateCodeSnippet,
    SET_VALIDATION_RESULTS,
    SetValidationResults
} from '../../src/utils/types';
import { Actions, GET_CODE_SNIPPET, ResetAnswers, SetChoices, GetChoices } from '../../src/utils/types';
import { AddonActions } from '../addons/types';
import { handleAction as handleAddonAction } from '../addons/project';
import { existsSync } from 'fs';
import { testAppPath, getProjectPath } from '../addons/project';
import {
    GET_PROJECT_PATH,
    SET_PROJECT_PATH,
    SetProjectPath,
    UPDATE_PROJECT_PATH,
    UPDATE_PROJECT_PATH_RESULT,
    UpdateProjectPathResult,
    VALIDATE_ANSWERS
} from '../addons/project/types';
import { DynamicChoices } from '@sap-ux/ui-prompting';

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
        const currentAppPath = getProjectPath();
        const promptsAPI = await PromptsAPI.init(currentAppPath);
        // Call API to get table questions - it should validate of path is supported
        const { questions } = await promptsAPI.getPrompts(SupportedBuildingBlocks.Table);
        const entityQuestion = questions.find((question) => question.name === 'entity');
        if (entityQuestion && 'choices' in entityQuestion && typeof entityQuestion.choices === 'function') {
            await entityQuestion.choices({});
        }
    } catch (e) {
        return `Error: ${e.message || e}`;
    }
};

async function handleAction(action: Actions): Promise<void> {
    try {
        const fs = await getEditor();
        let currentAppPath = getProjectPath();
        // ToDo - why init on each action handling?
        const promptsAPI = await PromptsAPI.init(currentAppPath, fs);
        switch (action.type) {
            case GET_QUESTIONS: {
                let responseAction: Actions | undefined;
                const { groups, questions } = await promptsAPI.getPrompts(action.value);
                if (action.value === SupportedBuildingBlocks.Table) {
                    // Post processing
                    responseAction = { type: SET_TABLE_QUESTIONS, questions, groups };
                } else if (action.value === SupportedBuildingBlocks.Chart) {
                    // Post processing
                    responseAction = { type: SET_CHART_QUESTIONS, questions, groups };
                } else if (action.value === SupportedBuildingBlocks.FilterBar) {
                    // Post processing
                    responseAction = { type: SET_FILTERBAR_QUESTIONS, questions, groups };
                }
                if (responseAction) {
                    sendMessage(responseAction);
                }
                break;
            }
            case GET_CHOICES: {
                const { names, buildingBlockType, answers } = action as GetChoices;
                const result: DynamicChoices = {};
                for (const name of names) {
                    const choices = await promptsAPI.getChoices(buildingBlockType as any, name, answers);
                    result[name] = choices;
                }

                const responseAction: SetChoices = {
                    type: SET_CHOICES,
                    choices: result
                };
                sendMessage(responseAction);
                break;
            }
            case APPLY_ANSWERS: {
                const { answers, buildingBlockType } = action;
                // ToDo recheck after cleanup for answers
                const _fs = promptsAPI.submitAnswers(buildingBlockType, answers as any);
                console.log(currentAppPath);
                await promisify(_fs.commit).call(_fs);
                const responseAction: ResetAnswers = {
                    type: RESET_ANSWERS,
                    buildingBlockType
                };
                sendMessage(responseAction);
                break;
            }
            case GET_PROJECT_PATH: {
                const responseAction: SetProjectPath = {
                    type: SET_PROJECT_PATH,
                    path: currentAppPath
                };
                sendMessage(responseAction);
                break;
            }
            case UPDATE_PROJECT_PATH: {
                let newProjectPath = action.path ? join(action.path) : testAppPath;
                let message: string | undefined;
                try {
                    if (action.path && !existsSync(newProjectPath)) {
                        message = 'Provided path does not exist';
                    }
                    // Reset fs
                    if (!message) {
                        currentAppPath = newProjectPath;
                    }
                    // Call API to get table questions - it should validate of path is supported
                    const { questions } = await promptsAPI.getPrompts(SupportedBuildingBlocks.Table);
                    const entityQuestion = questions.find((question) => question.name === 'entity');
                    if (entityQuestion && 'choices' in entityQuestion && typeof entityQuestion.choices === 'function') {
                        // ToDo - test if can be reusaded validateProject
                        await entityQuestion.choices({});
                    }
                } catch (e) {
                    message = `Error: ${e.message || e}`;
                    console.log(e);
                }
                const responseAction: UpdateProjectPathResult = {
                    type: UPDATE_PROJECT_PATH_RESULT,
                    saved: !message,
                    message,
                    path: !message ? currentAppPath : undefined
                };
                sendMessage(responseAction);
                break;
            }
            case GET_CODE_SNIPPET: {
                const { answers, buildingBlockType } = action;
                // ToDo recheck after cleanup for answers
                const codeSnippet = promptsAPI.getCodeSnippet(buildingBlockType, answers as any);
                const responseAction: UpdateCodeSnippet = {
                    type: UPDATE_CODE_SNIPPET,
                    buildingBlockType,
                    codeSnippet,
                    answers
                };
                sendMessage(responseAction);
                break;
            }
            case VALIDATE_ANSWERS: {
                const validationResult = await promptsAPI.validateAnswers(
                    action.value,
                    action.answers,
                    action.questions
                );
                const responseAction: SetValidationResults = {
                    type: SET_VALIDATION_RESULTS,
                    validationResults: validationResult
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
    } catch (error) {
        console.log({ error });
    }
}
