import { debug } from 'debug';
import { extendLogger, Logger } from '../src';

describe('extendLogger', () => {
    const mockDebugLogger = jest.spyOn(debug, 'enable');
    const namespace = '~namespace';
    const logger: Logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };

    it('add debugger and enable it but leave the original logger alone', () => {
        const extLogger = extendLogger(logger, namespace);
        expect((logger as any)['debug']).not.toBeDefined();
        expect(extLogger.info).toBeDefined();
        expect(extLogger.debug).toBeDefined();
        expect(mockDebugLogger).toBeCalledWith(namespace);
    });

    it('original logger methods are still called', () => {
        const extLogger = extendLogger(logger, namespace);
        const message = '~testMessage';
        extLogger.info(message);
        expect(logger.info).toBeCalledWith(message);
        extLogger.warn(message);
        expect(logger.warn).toBeCalledWith(message);
        extLogger.error(message);
        expect(logger.error).toBeCalledWith(message);
    });
});
