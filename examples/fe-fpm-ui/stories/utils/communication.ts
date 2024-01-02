import {
    GET_PROJECT_PATH,
    GetProjectPath,
    SET_PROJECT_PATH,
    UPDATE_PROJECT_PATH,
    UPDATE_PROJECT_PATH_RESULT,
    UpdateProjectPath,
    UpdateProjectPathResultPayload
} from '../../.storybook/addons/project';
import type { IQuestion } from '../../src/components';
import type { Actions, GetChoices, GetCodeSnippet } from './types';
import {
    APPLY_ANSWERS,
    GET_CHOICES,
    GET_CODE_SNIPPET,
    GET_QUESTIONS,
    GetQuestions,
    SET_CHART_QUESTIONS,
    SET_CHOICES,
    SET_FILTERBAR_QUESTIONS,
    SET_TABLE_QUESTIONS,
    SupportedBuildingBlocks
} from './types';

let ws: WebSocket | undefined;

export type Listener = (action: Actions) => void;
const listeners: { [key: string]: Listener[] } = {};
export function getWebSocket(): WebSocket {
    if (!ws) {
        // Connect to the WebSocket server from the preview
        ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = (event) => {
            console.log(`Received message from main.js: ${event.data}`);
            const action = JSON.parse(event.data);
            const handlers = listeners[action.type];
            if (handlers) {
                for (const handler of handlers) {
                    handler(action);
                }
            }
        };
    }

    return ws;
}

function waitForConnection(callback: () => void, interval = 500) {
    if (ws?.readyState === 1) {
        callback();
    } else {
        setTimeout(function () {
            waitForConnection(callback, interval);
        }, interval);
    }
}

export function sendMessage(action: unknown): void {
    waitForConnection(() => {
        getWebSocket().send(JSON.stringify(action));
    });
}

export function onMessageAttach(type: string, listener: Listener): void {
    if (!listeners[type]) {
        listeners[type] = [];
    }
    listeners[type].push(listener);
}

export function onMessageDetach(type: string, listener: Listener): void {
    if (listeners[type]) {
        const index = listeners[type].indexOf(listener);
        listeners[type].splice(index, 1);
    }
}

const QUESTIONS_TYPE_MAP = new Map([
    [SupportedBuildingBlocks.Table, SET_TABLE_QUESTIONS],
    [SupportedBuildingBlocks.Chart, SET_CHART_QUESTIONS],
    [SupportedBuildingBlocks.FilterBar, SET_FILTERBAR_QUESTIONS]
]);

export function getQuestions(type: SupportedBuildingBlocks): Promise<IQuestion[]> {
    return new Promise((resolve, error) => {
        const getAction: GetQuestions = {
            type: GET_QUESTIONS,
            value: type
        };
        sendMessage(getAction);
        const expectedActionType = QUESTIONS_TYPE_MAP.get(type);
        if (!expectedActionType) {
            return error('Unsupported type');
        }
        const handleMessage = (action: Actions) => {
            if ('questions' in action && Array.isArray(action.questions)) {
                onMessageDetach(expectedActionType, handleMessage);
                resolve(action.questions as IQuestion[]);
            }
        };
        onMessageAttach(expectedActionType, handleMessage);
    });
}

export function getChoices(
    name: string,
    buildingBlockType: SupportedBuildingBlocks,
    answers: unknown
): Promise<{ name: string; choices: unknown[] }> {
    return new Promise((resolve, error) => {
        const getAction: GetChoices = {
            type: GET_CHOICES,
            answers,
            buildingBlockType,
            name
        };
        sendMessage(getAction);
        const expectedActionType = SET_CHOICES;
        const handleMessage = (action: Actions) => {
            if ('name' in action && 'choices' in action && Array.isArray(action.choices)) {
                onMessageDetach(expectedActionType, handleMessage);
                resolve({
                    name: action.name as any,
                    choices: action.choices
                });
            }
        };
        onMessageAttach(SET_CHOICES, handleMessage);
    });
}
export function applyAnswers(
    buildingBlockType: SupportedBuildingBlocks,
    answers: unknown
): Promise<{ buildingBlockType: SupportedBuildingBlocks }> {
    return new Promise((resolve, error) => {
        const getAction = {
            type: APPLY_ANSWERS,
            answers,
            buildingBlockType
        };
        sendMessage(getAction);
        resolve({ buildingBlockType: buildingBlockType });
    });
}

export function getProjectPath(): Promise<string> {
    return new Promise((resolve) => {
        const getAction: GetProjectPath = {
            type: GET_PROJECT_PATH
        };
        sendMessage(getAction);
        const handleMessage = (action: Actions) => {
            if (action.type === SET_PROJECT_PATH) {
                resolve(action.path);
            }
            onMessageDetach(SET_PROJECT_PATH, handleMessage);
        };
        onMessageAttach(SET_PROJECT_PATH, handleMessage);
    });
}

export function updateProjectPath(path: string): Promise<UpdateProjectPathResultPayload> {
    return new Promise((resolve) => {
        const action: UpdateProjectPath = {
            type: UPDATE_PROJECT_PATH,
            path
        };
        sendMessage(action);
        const handleMessage = (responseAction: Actions) => {
            if (responseAction.type === UPDATE_PROJECT_PATH_RESULT) {
                resolve(responseAction);
            }
            onMessageDetach(UPDATE_PROJECT_PATH_RESULT, handleMessage);
        };
        onMessageAttach(UPDATE_PROJECT_PATH_RESULT, handleMessage);
    });
}

export function getCodeSnippet(buildingBlockType: SupportedBuildingBlocks, answers: unknown): void {
    const action: GetCodeSnippet = {
        type: GET_CODE_SNIPPET,
        buildingBlockType,
        answers
    };
    sendMessage(action);
}
