import type { Question } from '../../src/components';

let ws: WebSocket | undefined;

export type Action = { data: unknown };
export type LIstener = (action: Action) => void;
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

function waitForConnection(callback, interval = 500) {
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
    ['table', 'SET_TABLE_QUESTIONS'],
    ['chart', 'SET_CHART_QUESTIONS'],
    ['filterBar', 'SET_FILTERBAR_QUESTIONS']
]);

export function getQuestions(type: string): Promise<Question[]> {
    return new Promise((resolve, error) => {
        sendMessage({
            type: 'GET_QUESTIONS',
            value: type
        });
        const expectedActionType = QUESTIONS_TYPE_MAP.get(type);
        if (!expectedActionType) {
            return error('Unsupported type');
        }
        const handleMessage = (action: Action) => {
            if (Array.isArray(action.data)) {
                onMessageDetach(expectedActionType, handleMessage);
                resolve(action.data);
            }
        };
        onMessageAttach(expectedActionType, handleMessage);
    });
}
