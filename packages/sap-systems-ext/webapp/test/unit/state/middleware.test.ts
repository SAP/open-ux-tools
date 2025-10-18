import type { Action, Middleware } from 'redux';
import { postMessageMiddleware } from '../../../src/state/middleware';
import { store } from '../../../src/state/store';

const vscode = {
    postMessage: jest.fn()
};
window.acquireVsCodeApi = (): typeof vscode => vscode;

declare global {
    interface Window {
        acquireVsCodeApi: () => void;
    }
}

describe('Middleware', () => {
    const create = (): {
        store: typeof store;
        next: { mockReturnValue: (action: Action) => void };
        invoke: (action: Action) => Middleware;
    } => {
        const next = jest.fn();
        const invoke = (action: Action): Middleware => postMessageMiddleware(store)(next)(action);
        return { store, next, invoke };
    };
    const { next, invoke } = create();
    const action = { type: 'WEBVIEW_READY' };
    next.mockReturnValue(action);

    it('Handle messages', (done) => {
        // Post message
        const spyPostMessage = jest.spyOn(vscode, 'postMessage');
        const spyDispatch = jest.spyOn(store, 'dispatch');
        invoke(action);
        expect(next).toHaveBeenCalledWith(action);
        expect(spyPostMessage).toHaveBeenCalledTimes(1);
        expect(1).toEqual(1);
        // jsdom doesn't set proper orign for post message event. In middleware we check for window.origin, mock it here
        (window as { origin: string }).origin = '';
        // Receive message
        window.postMessage({ type: 'WEBVIEW_READY' }, '*');
        // Check that message was dispatched
        setTimeout(() => {
            expect(spyDispatch).toHaveBeenCalledTimes(1);
            done();
        }, 1000);
    });
});
