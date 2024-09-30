import { DefaultLogger, createCLILogger, LogWrapper } from '../src/logWrapper';
import type { Logger } from 'yeoman-environment';

describe('Test logWrapper', () => {
    test('Test logWrapper functions ', () => {
        const loggerProps = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'getChildLogger', 'getLogLevel'];
        expect(Object.keys(DefaultLogger)).toEqual(loggerProps);

        expect(Object.keys(DefaultLogger.getChildLogger())).toStrictEqual(loggerProps);

        const consoleErrorSpy = jest.spyOn(console, 'error');
        const consoleLogSpy = jest.spyOn(console, 'log');
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        const consoleTraceSpy = jest.spyOn(console, 'trace');

        DefaultLogger.fatal('Fatal');
        expect(consoleLogSpy).toHaveBeenCalledWith('Fatal');
        expect(DefaultLogger.warn('warn')).toBeUndefined();
        expect(DefaultLogger.info('info')).toBeUndefined();
        expect(DefaultLogger.trace('trace')).toBeUndefined();

        DefaultLogger.error('Error');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error');

        const logWrapper = new LogWrapper('TestLogger', {} as Logger, 'info');

        LogWrapper['_yoLogger'] = undefined as any;
        LogWrapper['logAtLevel']('info', 'Info message');
        expect(consoleErrorSpy).toHaveBeenCalledWith('LogWrapper is not initialised');

        console.log = jest.fn();
        //@ts-expect-error - private member access
        LogWrapper['_yoLogger'] = DefaultLogger.info;
        LogWrapper['logAtLevel']('info', 'Info message');
        //@ts-expect-error - private member access
        let consoleMsg = console.log.mock.calls[0][0];
        expect(consoleMsg).toEqual(expect.stringContaining(`Info message`));

        const testLogger = createCLILogger('TestLogger', 'info');
        testLogger.info('Test msg');

        const consoleSpy = jest.spyOn(console, 'log');
        consoleMsg = consoleSpy.mock.calls[0][0];
        expect(consoleMsg).toEqual(expect.stringContaining(`"label": "TestLogger"`));

        logWrapper.fatal('Fatal');
        expect(consoleErrorSpy).toHaveBeenCalled();

        logWrapper.error('Error');
        expect(consoleErrorSpy).toHaveBeenCalled();

        logWrapper.warn('Warn');
        expect(consoleWarnSpy).toHaveBeenCalled();

        logWrapper.info('Info');
        expect(consoleLogSpy).toHaveBeenCalled();

        logWrapper.debug('Debug');
        expect(consoleLogSpy).toHaveBeenCalled();

        logWrapper.trace('Trace');
        expect(consoleTraceSpy).toHaveBeenCalled();

        expect(LogWrapper.log).toBeDefined();
        LogWrapper.log('A message');
        expect(consoleLogSpy).toHaveBeenCalled();

        try {
            logWrapper.getChildLogger();
            fail(`logWrapper.getChildLogger() should have thrown error but didn't`);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });
});
