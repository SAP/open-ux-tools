import type { PropsWithChildren, ReactElement } from 'react';
import React from 'react';
import '@testing-library/jest-dom';
import type { Store, Dispatch } from '@reduxjs/toolkit';
import { createStore } from '@reduxjs/toolkit';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render as rtlRender } from '@testing-library/react';
import { Provider } from 'react-redux';

import reducer from '../../src/slice';

export type State = ReturnType<typeof reducer>;

export interface Options<T = State> extends RenderOptions {
    initialState?: T;
    store?: Store<State>;
}

export function render<T = State>(
    ui: ReactElement,
    { initialState, store = createStore(reducer, initialState as unknown as State), ...renderOptions }: Options<T> = {}
): RenderResult & { store: Store; dispatch: jest.SpyInstance<Dispatch> } {
    function Wrapper({ children }: PropsWithChildren<{}>): ReactElement {
        return <Provider store={store}>{children}</Provider>;
    }
    const origDispatch = store.dispatch;
    const dispatch = jest.fn(origDispatch);
    store.dispatch = dispatch;
    return { ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }), store, dispatch };
}

export const mockDomEventListener = (handler: Document | Window | Element = document): DOMEventListenerMock => {
    const domEventListeners: { [k: string]: Array<Function> } = {};
    // Mock for add event listener
    handler.addEventListener = jest.fn((event, cb) => {
        if (!domEventListeners[event]) {
            domEventListeners[event] = [];
        }
        domEventListeners[event].push(cb as Function);
    });
    handler.removeEventListener = jest.fn((event, cb) => {
        if (domEventListeners[event]) {
            const index = domEventListeners[event].findIndex((storedCb) => storedCb === cb);
            if (index !== -1) {
                domEventListeners[event].splice(index, 1);
            }
            if (domEventListeners[event].length === 0) {
                delete domEventListeners[event];
            }
        }
    });
    return {
        simulateEvent: (name: string, value: object): void => {
            if (domEventListeners[name]) {
                for (const cb of domEventListeners[name]) {
                    cb(value);
                }
            }
        },
        cleanDomEventListeners: (): void => {
            for (const eventName in domEventListeners) {
                delete domEventListeners[eventName];
            }
        },
        domEventListeners
    };
};
