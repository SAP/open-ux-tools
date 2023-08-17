import { getLogger, setLogLevelVerbose } from '../../../src/tracing';

describe('Tests for logger', () => {
    test('Get logger and check log functions', () => {
        const logger = getLogger();
        expect(typeof logger.debug).toBe('function');
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
    });

    test('Get logger and change log level', () => {
        const logger = getLogger() as any;
        expect(logger.winstonLevel).toBe('info');
        setLogLevelVerbose();
        const verboseLogger = getLogger() as any;
        expect(verboseLogger.winstonLevel).toBe('debug');
    });
});
