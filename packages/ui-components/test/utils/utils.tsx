export interface DOMEventListenerMock {
    simulateEvent: (name: string, value: object) => void;
    cleanDomEventListeners: () => void;
    domEventListeners: { [k: string]: Array<Function> };
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

declare global {
    interface Window {
        ResizeObserver: any;
        resizeobserversMocks: Array<any>;
    }
}

export const mockResizeObserver = (): void => {
    window.resizeobserversMocks = [];
    window.ResizeObserver = jest.fn((callback: () => void) => {
        const resizeObserver = {
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: () => {
                const index = window.resizeobserversMocks.indexOf(resizeObserver);
                window.resizeobserversMocks.splice(index, 1);
            },
            simulate: () => {
                callback();
            }
        };
        window.resizeobserversMocks.push(resizeObserver);
        return resizeObserver;
    });
};
