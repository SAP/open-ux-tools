import { join } from 'path';
import type { ChartPromptsAnswer, FilterBarPromptsAnswer, TablePromptsAnswer } from '@sap-ux/fe-fpm-writer';
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
    PromptsType,
    GET_CHOICES,
    SET_CHOICES,
    APPLY_ANSWERS,
    RESET_ANSWERS,
    UPDATE_CODE_SNIPPET,
    SET_VALIDATION_RESULTS,
    GET_CODE_SNIPPET,
    REQUEST_I18N,
    RESPONSE_I18N,
    CREATE_I18N_ENTRY
} from '../../src/utils/types';
import type {
    Actions,
    ResetAnswers,
    SetChoices,
    GetChoices,
    UpdateCodeSnippet,
    SetValidationResults,
    ResponseI18n
} from '../../src/utils/types';
import type { AddonActions } from '../addons/types';
import { handleAction as handleAddonAction } from '../addons/project';
import { testAppPath, getApplication } from '../addons/project';
import { GET_PROJECT_PATH, SET_PROJECT_PATH, VALIDATE_ANSWERS } from '../addons/project/types';
import type { ApplicationInformation, SetProjectPath } from '../addons/project/types';
import type { DynamicChoices } from '@sap-ux/ui-prompting';
import { getPromptApi } from './api';
import { getI18nBundle, updateI18nBundle } from './i18nBundle';

const sampleAppPath = join(__dirname, '../../../fe-fpm-cli/sample/fe-app');

let fsEditor: Editor | undefined;
const connections: WebSocket[] = [];

/**
 * Initializes the memfs and copies over the sample Fiori elements application.
 *
 * @param forceUpdate Overwrite cached editor
 * @returns {Promise<Editor>} the memfs editor object.
 */
export async function getEditor(forceUpdate = false): Promise<Editor> {
    if (fsEditor && !forceUpdate) {
        return fsEditor;
    }
    fsEditor = create(createStorage());

    if (testAppPath === getApplication()?.projectPath) {
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

/**
 * Method sends action to UI using WebSocket connection.
 *
 * @param action - Action object
 */
function sendMessage(action: Actions): void {
    if (!connections.length) {
        return;
    }
    for (const connection of connections) {
        connection.send(JSON.stringify(action));
    }
}

/**
 * Method resolves current i18n bundle and sends action with latest bundle to ui.
 *
 * @param app Application to refresh
 */
async function refreshI18nBundle(app?: ApplicationInformation): Promise<void> {
    if (app?.projectPath) {
        const bundle = await getI18nBundle(app.projectPath, app.appId);
        if (bundle) {
            const responseAction: ResponseI18n = {
                type: RESPONSE_I18N,
                bundle
            };
            sendMessage(responseAction);
        }
    }
}

/**
 * Method handles passed action from UI.
 *
 * @param action Action to handle.
 */
async function handleAction(action: Actions): Promise<void> {
    try {
        const fs = await getEditor();
        const currentApp = getApplication();
        const promptsAPI = await getPromptApi(currentApp?.projectPath, fs, currentApp?.appId);
        switch (action.type) {
            case GET_QUESTIONS: {
                let responseAction: Actions | undefined;
                const { groups, questions, initialAnswers } = await promptsAPI.getPrompts(action.value);
                if (action.value === PromptsType.Table) {
                    // Post processing
                    responseAction = {
                        type: SET_TABLE_QUESTIONS,
                        questions,
                        groups,
                        initialAnswers: initialAnswers as Partial<TablePromptsAnswer>
                    };
                } else if (action.value === PromptsType.Chart) {
                    // Post processing
                    responseAction = {
                        type: SET_CHART_QUESTIONS,
                        questions,
                        groups,
                        initialAnswers: initialAnswers as Partial<ChartPromptsAnswer>
                    };
                } else if (action.value === PromptsType.FilterBar) {
                    // Post processing
                    responseAction = {
                        type: SET_FILTERBAR_QUESTIONS,
                        questions,
                        groups,
                        initialAnswers: initialAnswers as Partial<FilterBarPromptsAnswer>
                    };
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
                const _fs = await promptsAPI.submitAnswers(buildingBlockType, answers);
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
                    application: currentApp
                };
                sendMessage(responseAction);
                break;
            }
            case GET_CODE_SNIPPET: {
                const { answers, buildingBlockType } = action;
                const codeSnippets = await promptsAPI.getCodeSnippets(buildingBlockType, answers);
                const responseAction: UpdateCodeSnippet = {
                    type: UPDATE_CODE_SNIPPET,
                    buildingBlockType,
                    codeSnippets,
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
            case REQUEST_I18N: {
                await refreshI18nBundle(currentApp);
                break;
            }
            case CREATE_I18N_ENTRY: {
                if (currentApp?.projectPath) {
                    await updateI18nBundle(
                        [{ key: action.key, value: action.value }],
                        currentApp?.projectPath,
                        currentApp?.appId
                    );
                    await refreshI18nBundle(currentApp);
                }
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
