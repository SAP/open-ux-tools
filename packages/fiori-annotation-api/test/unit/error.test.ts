import { ApiError, ApiErrorCode } from '../../src/error';

describe('API error class', () => {
    test('constructor', () => {
        const error = new ApiError('Some problem triggered');
        expect(error.message).toBe('Some problem triggered');
        expect(error.errorCode).toBe(ApiErrorCode.General);
        expect(error.messageMap.size).toBe(0);
    });

    test('constructor with extra params', () => {
        const msgMap = new Map().set('group1', ['message 1', 'message 2']);
        const error = new ApiError('Some new problem triggered', ApiErrorCode.CompileError, msgMap);
        expect(error.message).toBe('Some new problem triggered');
        expect(error.errorCode).toBe(ApiErrorCode.CompileError);
        expect(error.messageMap).toEqual(msgMap);
    });

    test('toString', () => {
        const msgMap = new Map();
        msgMap.set('group1', ['message 1', 'message 2']);
        msgMap.set('group2', ['message 3', 'message 4']);
        const error = new ApiError('new problem triggered', ApiErrorCode.CompileError, msgMap);
        expect(error.toString()).toBe('Error: new problem triggered');
        expect(error.toString(true)).toMatchInlineSnapshot(`
            "Error: new problem triggered. Error code: 2. Other messages:
            [group1]:
            - message 1
            - message 2
            [group2]:
            - message 3
            - message 4"
        `);
        expect(error.getExtendedMessage()).toMatchInlineSnapshot(`
            "new problem triggered. Other messages:
            [group1]:
            - message 1
            - message 2
            [group2]:
            - message 3
            - message 4"
        `);
        expect('test - ' + error).toBe('test - Error: new problem triggered');
    });
});
