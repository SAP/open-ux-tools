import type { Question } from 'inquirer';
import {
    GET_QUESTIONS,
    SET_TABLE_QUESTIONS,
    SET_CHART_QUESTIONS,
    SET_FILTERBAR_QUESTIONS,
    GetQuestions,
    SupportedBuildingBlocks
} from './types';
import type { Actions } from './types';

let ws: WebSocket | undefined;

export type LIstener = (action: Actions) => void;
const listeners: { [key: string]: LIstener[] } = {};
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

export function onMessageAttach(type: string, listener: LIstener): void {
    if (!listeners[type]) {
        listeners[type] = [];
    }
    listeners[type].push(listener);
}

export function onMessageDetach(type: string, listener: LIstener): void {
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

export function getQuestions(type: SupportedBuildingBlocks): Promise<Question[]> {
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
                resolve(action.questions as Question[]);
            }
        };
        onMessageAttach(expectedActionType, handleMessage);
    });
}
