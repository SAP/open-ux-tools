import { logger } from '../../../src/cpe/logger';
import Log from 'mock/sap/base/Log';

describe('logger', () => {
    beforeEach(() => {
        Log.error.mockClear();
    })
    test('info', async () => {
        logger.info('test');
        expect(Log.info).toBeCalledTimes(1);
    });
    test('error', async () => {
        logger.error('test');
        expect(Log.error).toBeCalledTimes(1);
    });
    test('warn', async () => {
        logger.warn('test');
        expect(Log.warning).toBeCalledTimes(1);
    });
    test('debug', async () => {
        logger.debug('test');
        expect(Log.debug).toBeCalledTimes(1);
    });

    test('error - object', async () => {
        logger.error(new Error('errror'));
        expect(Log.error).toBeCalledTimes(1);
    });
});
