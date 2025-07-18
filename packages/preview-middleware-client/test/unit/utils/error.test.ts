import { getError } from '../../../src/utils/error';

describe('utils/error', () => {
    test('getError with Error', async () => {
        const error = getError(new Error('test'));
        expect(error.message).toEqual('test');
    });

    test('getError with string', async () => {
        const error = getError('test');
        expect(error.message).toEqual('"test"');
    });

    test('getError with object', async () => {
        const error = getError({error: 'test'});
        expect(error.message).toEqual('{"error":"test"}');
    });
});
