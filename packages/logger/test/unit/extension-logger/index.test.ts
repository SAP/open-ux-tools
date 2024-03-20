import { ExtensionLogger } from '../../../src';

const channelMock = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    show: jest.fn()
};
jest.mock(
    'vscode',
    () => {
        return {
            window: {
                createOutputChannel() {
                    return channelMock;
                }
            }
        };
    },
    { virtual: true }
);

/**
 *  Winston logger writes messages async. Use flushPromises to wait
 */
const flushPromises = (): Promise<void> => new Promise(setImmediate);

describe('ExtensionLogger', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should be defined', () => {
        expect(ExtensionLogger).toBeDefined();
    });

    test('log error using', async () => {
        const logger = new ExtensionLogger('test');
        logger.error('error test');
        await flushPromises();
        expect(channelMock.error).toBeCalledWith('error test');
    });

    test('log error with args', async () => {
        const logger = new ExtensionLogger('test');
        logger.error('error args', { 'one': 1, 'two': 2 }, undefined, null, [1, 2, 3], 'string');
        await flushPromises();
        expect(channelMock.error).toBeCalledWith(`error args { one: 1, two: 2 } undefined null [ 1, 2, 3 ] 'string'`);
    });

    test('log warn', async () => {
        const logger = new ExtensionLogger('test');
        logger.warn('warn test');
        await flushPromises();
        expect(channelMock.warn).toBeCalledWith('warn test');
    });

    test('log info', async () => {
        const logger = new ExtensionLogger('test');
        logger.info('info test');
        await flushPromises();
        expect(channelMock.info).toBeCalledWith('info test');
    });

    test('log debug', async () => {
        const logger = new ExtensionLogger('test');
        logger.debug('debug test');
        await flushPromises();
        expect(channelMock.debug).toBeCalledWith('debug test');
    });

    test('log trace', async () => {
        const logger = new ExtensionLogger('test');
        logger.trace('trace test');
        await flushPromises();
        expect(channelMock.trace).toBeCalledWith('trace test');
    });

    test('log with args and unknown log level', async () => {
        const logger = new ExtensionLogger('test');
        (logger as any).logWithArgs(
            undefined,
            'wrong level',
            { 'one': 1, 'two': 2 },
            undefined,
            null,
            [1, 2, 3],
            'string'
        );
        await flushPromises();
        expect(channelMock.trace).toBeCalledWith(`wrong level { one: 1, two: 2 } undefined null [ 1, 2, 3 ] 'string'`);
    });

    test('calling show on channel', async () => {
        const logger = new ExtensionLogger('test');
        logger.show();
        await flushPromises();
        expect(channelMock.show).toBeCalled();
    });
});
