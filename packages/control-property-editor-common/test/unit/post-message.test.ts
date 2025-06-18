import { startPostMessageCommunication } from '../../src/post-message';

describe('postMessage', () => {
    let actionHandlerMock: jest.Mock;
    let addEventListenerSpy: jest.SpyInstance;
    let removeEventListenerSpy: jest.SpyInstance;

    beforeEach(() => {
        removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
        addEventListenerSpy = jest.spyOn(window, 'addEventListener');
        actionHandlerMock = jest.fn().mockResolvedValue('action');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test('startPostMessageCommunication', () => {
        const target = {
            source: 'testSource',
            origin: 'http://localhost',
            data: {
                type: 'post-message-action',
                action: {
                    testProperty: 'test'
                } as object
            }
        };
        const event = {
            source: target,
            origin: 'http://localhost',
            data: {
                type: 'post-message-action',
                action: {
                    testProperty: 'test'
                } as object
            }
        };
        startPostMessageCommunication(target as any, actionHandlerMock);

        const callBackFn = addEventListenerSpy.mock.calls[0][1];
        callBackFn(event as any);

        expect(actionHandlerMock).toHaveBeenCalled();
    });

    test('startPostMessageCommunication - target as function', () => {
        const postMessageMock = jest.fn();
        const target = {
            source: 'testSource',
            origin: 'http://localhost',
            data: {
                type: 'post-message-action',
                action: {
                    testProperty: 'test'
                } as object
            },
            postMessage: postMessageMock
        };
        const targetParam = () => {
            return target;
        };
        const event = {
            source: target,
            origin: 'http://localhost',
            data: {
                type: 'test-action',
                action: {
                    testProperty: 'test'
                } as object
            }
        };
        const result = startPostMessageCommunication(targetParam as any, actionHandlerMock);

        const callBackFn = addEventListenerSpy.mock.calls[0][1];
        callBackFn(event as any);
        expect(actionHandlerMock).not.toHaveBeenCalled();
        result.dispose();

        expect(removeEventListenerSpy).toHaveBeenCalled();
        expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));

        result.sendAction({});
        expect(postMessageMock).toHaveBeenCalled();
        expect(postMessageMock).toHaveBeenCalledWith({ type: 'post-message-action', action: {} }, 'http://localhost');
    });

    test('startPostMessageCommunication - target undefined', () => {
        const target = undefined;
        const targetParam = () => {
            return target;
        };
        const event = {
            source: {},
            origin: 'http://localhost',
            data: {
                type: 'test-action',
                action: {
                    testProperty: 'test'
                } as object
            }
        };
        const result = startPostMessageCommunication(targetParam as any, actionHandlerMock);

        const callBackFn = addEventListenerSpy.mock.calls[0][1];
        callBackFn(event as any);

        result.sendAction({});
        expect(addEventListenerSpy).toHaveBeenCalled();
    });
});
