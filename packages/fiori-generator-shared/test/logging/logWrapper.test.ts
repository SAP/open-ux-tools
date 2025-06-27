import type { ChildLoggerOptions, Logger as SapUxLogger, Transport } from '@sap-ux/logger';
import type { IVSCodeExtLogger } from '@vscode-logging/logger';
import type { Logger as YoLogger } from 'yeoman-environment';
import { createCLILogger, DefaultLogger, LogWrapper } from '../../src/logging/logWrapper';

describe('Test logWrapper', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        // Reset static values
        LogWrapper['_yoLogger'] = undefined as any;
        LogWrapper['_vscodeLogger'] = undefined as any;
        LogWrapper['_logLevel'] = undefined as any;
    });
    test('Test logWrapper functions ', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error');
        const consoleLogSpy = jest.spyOn(console, 'log');
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        const consoleTraceSpy = jest.spyOn(console, 'trace');

        // DefaultLogger tests
        DefaultLogger.fatal('fatal');
        expect(consoleLogSpy).toHaveBeenLastCalledWith('fatal');
        DefaultLogger.warn('warn');
        expect(consoleWarnSpy).toHaveBeenLastCalledWith('warn');
        DefaultLogger.info('info');
        expect(consoleLogSpy).toHaveBeenLastCalledWith('info');
        DefaultLogger.trace('trace');
        expect(consoleTraceSpy).toHaveBeenLastCalledWith('trace');
        DefaultLogger.error('error');
        expect(consoleErrorSpy).toHaveBeenLastCalledWith('error');
        DefaultLogger.log('log');
        expect(consoleLogSpy).toHaveBeenLastCalledWith('log');
        // Log level is ignored as log levels dont align between @sap-ux/logger and @vscode-logging/logger
        DefaultLogger.log({ message: 'testLogObjectMsg', level: 0 });
        expect(consoleLogSpy).toHaveBeenLastCalledWith('testLogObjectMsg');

        // LogWrapper tests
        const logWrapper = new LogWrapper('TestLogger', {} as YoLogger, 'info');

        LogWrapper['_yoLogger'] = undefined as any;
        LogWrapper['logAtLevel']('info', 'Info message');
        expect(consoleErrorSpy).toHaveBeenCalledWith('`LogWrapper` is not initialised.');

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
        expect(consoleMsg).toEqual(expect.stringContaining(`INFO: Info message`));

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

        logWrapper.log('Log');
        expect(consoleLogSpy).toHaveBeenCalled();

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

    test('should log with extension logger', () => {
        const mockLogger = {
            debug: jest.fn()
        };
        const mockExtensionLogger = {
            getChildLogger: () => mockLogger
        } as unknown as IVSCodeExtLogger;

        new LogWrapper('ExtensionLogger', {} as YoLogger, 'info', mockExtensionLogger);
        expect(mockLogger.debug).toHaveBeenCalledWith('Logging has been configured at log level: info.');
    });

    test('should be compatible with `@sap-ux/logger`', () => {
        const consoleLogSpy = jest.spyOn(console, 'log');

        (DefaultLogger as SapUxLogger).log('log');
        expect(consoleLogSpy).toHaveBeenLastCalledWith('log');
        expect((DefaultLogger as SapUxLogger).add({} as Transport)).toMatchObject(DefaultLogger);
        expect((DefaultLogger as SapUxLogger).remove({} as Transport)).toMatchObject(DefaultLogger);
        expect((DefaultLogger as SapUxLogger).transports()).toEqual([]);
        expect((DefaultLogger as SapUxLogger).child({} as ChildLoggerOptions)).toMatchObject(DefaultLogger);

        // LogWrapper tests
        const yoLoggerSpy = jest.fn() as unknown as YoLogger;
        const logWrapper = new LogWrapper('TestLogger', yoLoggerSpy, 'info');
        logWrapper.log({ message: 'testLogObjectMsg', level: 1 });
        expect(yoLoggerSpy).toHaveBeenLastCalledWith(expect.stringContaining('testLogObjectMsg'));

        logWrapper.add();
        expect(yoLoggerSpy).toHaveBeenLastCalledWith(
            expect.stringContaining('Log method `add(transport)` not implemented.')
        );
        logWrapper.remove();
        expect(yoLoggerSpy).toHaveBeenLastCalledWith(
            expect.stringContaining('Log method `remove(transport)` not implemented.')
        );
        logWrapper.transports();
        expect(yoLoggerSpy).toHaveBeenLastCalledWith(
            expect.stringContaining('Log method `transports()` not implemented.')
        );
        logWrapper.child();
        expect(yoLoggerSpy).toHaveBeenLastCalledWith(
            expect.stringContaining('Log method `child(options)` not implemented.')
        );
    });
});
