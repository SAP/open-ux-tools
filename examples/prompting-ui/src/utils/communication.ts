import type { Answers } from 'inquirer';
import {
    GET_PROJECT_PATH,
    SET_PROJECT_PATH,
    UPDATE_PROJECT_PATH,
    UPDATE_PROJECT_PATH_RESULT,
    VALIDATE_ANSWERS
} from '../addons/project/types';
import type {
    ApplicationInformation,
    GetProjectPath,
    UpdateProjectPath,
    UpdateProjectPathResultPayload,
    ValidateAnswers
} from '../addons/project/types';
import type { DynamicChoices, PromptQuestion, ValidationResults, PromptsGroup } from '@sap-ux/ui-prompting';
import type { Actions, CreateI18n, GetChoices, GetQuestions, RequestI18n } from './types';
import {
    APPLY_ANSWERS,
    GET_CHOICES,
    GET_CODE_SNIPPET,
    GET_QUESTIONS,
    SET_CHART_QUESTIONS,
    SET_CHOICES,
    SET_FILTERBAR_QUESTIONS,
    SET_TABLE_QUESTIONS,
    SET_VALIDATION_RESULTS,
    PromptsType,
    REQUEST_I18N,
    RESPONSE_I18N,
    CREATE_I18N_ENTRY
} from './types';
import type { Subset } from '@sap-ux/fe-fpm-writer/src/prompts/types';
import { I18nBundle } from '@sap-ux/ui-components';

let ws: WebSocket | undefined;

export type Listener = (action: Actions) => void;
const listeners: { [key: string]: Listener[] } = {};

/**
 * Method creates and returns WebSocket connection.
 * Creation happens only on first call and cached connection is returned on continuous calls.
 *
 * @param log Log message about received message
 * @returns WebSocket connection.
 */
export function getWebSocket(log = true): WebSocket {
    if (!ws) {
        // Connect to the WebSocket server from the preview
        ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = (event) => {
            if (log) {
                console.log(`Received message from main.js: ${event.data}`);
            }
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

/**
 * Method waits till WebSocket connection is created and is open to send messages.
 *
 * @param callback Callback triggered when connection is open
 * @param interval Interval to check for open connection if connection was closed on previous try
 */
function waitForOpenConnection(callback: () => void, interval = 500): void {
    if (ws?.readyState === 1) {
        callback();
    } else {
        setTimeout(function () {
            waitForOpenConnection(callback, interval);
        }, interval);
    }
}

/**
 * Method sends message through WebSocket connection.
 *
 * @param action Action to send as message
 */
export function sendMessage(action: unknown): void {
    waitForOpenConnection(() => {
        getWebSocket().send(JSON.stringify(action));
    });
}

/**
 * Attach listener to specific message/action type.
 * When message with attached action type is send - attached listener would be called/triggered.
 *
 * @param type Action/message type
 * @param listener Listener function
 */
export function onMessageAttach(type: string, listener: Listener): void {
    if (!listeners[type]) {
        listeners[type] = [];
    }
    listeners[type].push(listener);
}

/**
 * Detach listener of specific message/action type.
 *
 * @param type Action/message type
 * @param listener Listener function
 */
export function onMessageDetach(type: string, listener: Listener): void {
    if (listeners[type]) {
        const index = listeners[type].indexOf(listener);
        listeners[type].splice(index, 1);
    }
}

const QUESTIONS_TYPE_MAP = new Map([
    [PromptsType.Table, SET_TABLE_QUESTIONS],
    [PromptsType.Chart, SET_CHART_QUESTIONS],
    [PromptsType.FilterBar, SET_FILTERBAR_QUESTIONS]
]);

/**
 * Method returns prompt questions for passed prompt type.
 *
 * @param type Prompt type
 * @returns Prompt with questions for passed prompt type.
 */
export function getQuestions<T extends Answers>(
    type: PromptsType
): Promise<{ questions: PromptQuestion<T>[]; groups?: PromptsGroup[]; initialAnswers?: Subset<T> }> {
    return new Promise((resolve, reject) => {
        const getAction: GetQuestions = {
            type: GET_QUESTIONS,
            value: type
        };
        sendMessage(getAction);
        const expectedActionType = QUESTIONS_TYPE_MAP.get(type);
        if (!expectedActionType) {
            return reject('Unsupported type');
        }
        const handleMessage = (action: Actions) => {
            if ('questions' in action && Array.isArray(action.questions)) {
                onMessageDetach(expectedActionType, handleMessage);
                resolve({
                    questions: action.questions,
                    groups: 'groups' in action ? action.groups : undefined,
                    initialAnswers: 'initialAnswers' in action ? action.initialAnswers : undefined
                });
            }
        };
        onMessageAttach(expectedActionType, handleMessage);
    });
}

/**
 * Method requests choices for passed question names.
 *
 * @param names Question names
 * @param buildingBlockType Prompt type
 * @param answers Latest answers
 */
export function getChoices(names: string[], buildingBlockType: PromptsType, answers: Answers): void {
    const getAction: GetChoices = {
        type: GET_CHOICES,
        answers,
        buildingBlockType,
        names
    };
    sendMessage(getAction);
}

/**
 * Method to subscribe on dynamic choices update event.
 *
 * @param cb Callback when dynamic choices are resolved.
 * @returns Listener reference.
 */
export function subscribeOnChoicesUpdate(cb: (choices: DynamicChoices) => void): Listener {
    const handleMessage = (action: Actions) => {
        if ('choices' in action) {
            cb(action.choices);
        }
    };
    onMessageAttach(SET_CHOICES, handleMessage);
    return handleMessage;
}

/**
 * Method to unsubscribe from dynamic choices update event.
 *
 * @param listener Listener reference
 */
export function unsubscribeOnChoicesUpdate(listener: Listener): void {
    onMessageDetach(SET_CHOICES, listener);
}

/**
 * Method applies/saves answers.
 *
 * @param buildingBlockType Prompt type.
 * @param answers Answers to apply/save.
 */
export function applyAnswers(buildingBlockType: PromptsType, answers: Answers): Promise<void> {
    return new Promise((resolve) => {
        const getAction = {
            type: APPLY_ANSWERS,
            answers,
            buildingBlockType
        };
        sendMessage(getAction);
        resolve();
    });
}

/**
 * Method validates passed answers.
 *
 * @param promptType Prompt type
 * @param questions Question to validate
 * @param answers Answers to validate
 * @returns Validation result.
 */
export function validateAnswers(
    promptType: PromptsType,
    questions: PromptQuestion[],
    answers: Answers
): Promise<ValidationResults> {
    return new Promise((resolve) => {
        const getAction: ValidateAnswers = {
            type: VALIDATE_ANSWERS,
            value: promptType,
            questions,
            answers
        };
        sendMessage(getAction);
        const handleMessage = (action: Actions) => {
            onMessageDetach(SET_VALIDATION_RESULTS, handleMessage);
            if (action.type === SET_VALIDATION_RESULTS) {
                resolve({ ...action.validationResults });
            }
        };
        onMessageAttach(SET_VALIDATION_RESULTS, handleMessage);
    });
}

/**
 * Method returns curently saved/stored project path.
 *
 * @returns Curently saved/stored project path.
 */
export function getApplication(): Promise<ApplicationInformation | undefined> {
    return new Promise((resolve) => {
        const getAction: GetProjectPath = {
            type: GET_PROJECT_PATH
        };
        sendMessage(getAction);
        const handleMessage = (action: Actions) => {
            if (action.type === SET_PROJECT_PATH) {
                resolve(action.application);
            }
            onMessageDetach(SET_PROJECT_PATH, handleMessage);
        };
        onMessageAttach(SET_PROJECT_PATH, handleMessage);
    });
}

/**
 * Method updates current/stored project path with new path.
 *
 * @param application Information about application paths
 * @returns Update result information.
 */
export function updateProjectPath(
    application: ApplicationInformation | undefined
): Promise<UpdateProjectPathResultPayload> {
    return new Promise((resolve) => {
        const action: UpdateProjectPath = {
            type: UPDATE_PROJECT_PATH,
            application
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

/**
 * Method requests code snippet for passed answers.
 *
 * @param buildingBlockType Prompt type
 * @param answers Answers which would be used to generate code snippet
 */
export function getCodeSnippet(buildingBlockType: PromptsType, answers: Answers): void {
    const action = {
        type: GET_CODE_SNIPPET,
        buildingBlockType,
        answers
    };
    sendMessage(action);
}

/**
 * Method returns i18n bundle.
 *
 * @param type Prompt type
 * @returns Prompt with questions for passed prompt type.
 */
export function getI18nBundle(): Promise<I18nBundle> {
    return new Promise((resolve, reject) => {
        const getAction: RequestI18n = {
            type: REQUEST_I18N
        };
        sendMessage(getAction);
        const handleMessage = (action: Actions) => {
            if (action.type === RESPONSE_I18N) {
                onMessageDetach(RESPONSE_I18N, handleMessage);
                resolve(action.bundle);
            }
        };
        onMessageAttach(RESPONSE_I18N, handleMessage);
    });
}

export function createI18n(key: string, value: string): Promise<I18nBundle> {
    return new Promise((resolve, reject) => {
        const createAction: CreateI18n = {
            type: CREATE_I18N_ENTRY,
            key,
            value
        };
        sendMessage(createAction);
        const handleMessage = (action: Actions) => {
            if (action.type === RESPONSE_I18N) {
                onMessageDetach(RESPONSE_I18N, handleMessage);
                resolve(action.bundle);
            }
        };
        onMessageAttach(RESPONSE_I18N, handleMessage);
    });
}
