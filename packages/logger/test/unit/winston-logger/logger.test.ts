import 'jest-extended';
import type { Transport } from '../../../src';
import { LogLevel, ToolsLogger } from '../../../src';
import type { ArrayTransportLogEntry } from '../../../src/transports';
import {
    ConsoleTransport,
    ArrayTransport,
    NullTransport,
    UI5ToolingTransport,
    VSCodeTransport
} from '../../../src/transports';
import { NullTransport as WinstonNullTransport } from '../../../src/winston-logger/null-transport';
import { VSCodeTransport as WinstonVSCodeTransport } from '../../../src/winston-logger/vscode-output-channel-transport';
import winston from 'winston';

jest.mock(
    'vscode',
    () => {
        return {
            window: {
                createOutputChannel() {
                    return { appendLine: () => 0 };
                }
            }
        };
    },
    { virtual: true }
);

describe('Default (Winston) logger', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('Uses a console transport by default', () => {
        const logger = new ToolsLogger();
        expect(logger.transports()).toIncludeSameMembers([new ConsoleTransport()]);
    });

    it('Console transport is only added once', () => {
        const logger = new ToolsLogger({
            transports: Array.from({ length: 500 }, () => new ConsoleTransport()),
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([new ConsoleTransport()]);
    });

    it('Null transport is only added once', () => {
        const logger = new ToolsLogger({
            transports: Array.from({ length: 500 }, () => new NullTransport()),
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([new NullTransport()]);
    });

    it('VS Code transport is only added once per channel', () => {
        const logger = new ToolsLogger({
            transports: Array.from({ length: 500 }, () => new VSCodeTransport({ channelName: 'sampleChannel' })),
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([new VSCodeTransport({ channelName: 'sampleChannel' })]);
    });

    it('Should log into an array when no options are passed to array transport', () => {
        const logger = new ToolsLogger({
            transports: [new ArrayTransport()]
        });
        logger.debug('DEBUG');
        logger.info('INFO');
        logger.warn('WARN');
        logger.error('ERROR');
        expect(logger.transports()[0] instanceof ArrayTransport).toBeTrue();
        expect((logger.transports()[0] as ArrayTransport).logs).toMatchObject([
            { level: 'debug', message: 'DEBUG' },
            { level: 'info', message: 'INFO' },
            { level: 'warn', message: 'WARN' },
            { level: 'error', message: 'ERROR' }
        ]);
    });

    it('Should log into a provided array', () => {
        const logs: ArrayTransportLogEntry[] = [];
        const logger = new ToolsLogger({
            transports: [new ArrayTransport({ logs })]
        });
        logger.info('INFO');
        logger.warn('WARN');
        logger.error('ERROR');
        expect(logs).toMatchObject([
            { level: 'info', message: 'INFO' },
            { level: 'warn', message: 'WARN' },
            { level: 'error', message: 'ERROR' }
        ]);
    });

    it('Should log only messages according to custom log level into array', () => {
        const logs: ArrayTransportLogEntry[] = [];
        const logger = new ToolsLogger({
            transports: [new ArrayTransport({ logs, logLevel: LogLevel.Error })]
        });
        logger.warn('WARN');
        logger.error('ERROR');
        expect(logs).toMatchObject([{ level: 'error', message: 'ERROR' }]);
    });

    it('UI5 Tooling transport is only added once per channel', () => {
        const logger = new ToolsLogger({
            transports: Array.from({ length: 500 }, () => new UI5ToolingTransport({ moduleName: 'test:module' })),
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([new UI5ToolingTransport({ moduleName: 'test:module' })]);
    });

    it('Singleton transports (null, console, vscode, ui5Tooling) are only added once', () => {
        const transports = Array.from({ length: 500 }, (_, i) => {
            if (i % 10 === 0) {
                return new VSCodeTransport({ channelName: 'channel10' });
            } else if (i % 5 === 0) {
                return new VSCodeTransport({ channelName: 'channel5' });
            } else if (i % 3 === 0) {
                return new UI5ToolingTransport({ moduleName: 'test:module' });
            } else if (i % 2 === 0) {
                return new ConsoleTransport();
            } else {
                return new NullTransport();
            }
        }) as unknown as Transport[];

        const logger = new ToolsLogger({
            transports,
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([
            new NullTransport(),
            new ConsoleTransport(),
            new VSCodeTransport({ channelName: 'channel5' }),
            new VSCodeTransport({ channelName: 'channel10' }),
            new UI5ToolingTransport({ moduleName: 'test:module' })
        ]);
    });

    it('Will throw an error when trying to remove non-existent transport', () => {
        const logger = new ToolsLogger();
        expect(() => logger.remove(new NullTransport())).toThrow(/cannot remove non-existent transport/i);
    });

    it('Calls log method all of transports', () => {
        const consoleLog = jest.spyOn(winston.transports.Console.prototype, 'log').mockImplementation(() => 0);
        const nullLog = jest.spyOn(WinstonNullTransport.prototype, 'log').mockClear();
        const vscodeLog = jest.spyOn(WinstonVSCodeTransport.prototype, 'log').mockClear();
        const arrayLog = jest.spyOn(ArrayTransport.prototype, 'log').mockClear();
        const logger = new ToolsLogger({
            transports: [
                new ConsoleTransport(),
                new NullTransport(),
                new VSCodeTransport({ channelName: 'random' }),
                new ArrayTransport()
            ]
        });
        logger.info('info message');
        expect(consoleLog).toBeCalledWith(
            expect.objectContaining({ [Symbol.for('level')]: 'info', message: 'info message' }),
            expect.any(Function)
        );
        expect(nullLog).toBeCalledWith(
            expect.objectContaining({ [Symbol.for('level')]: 'info', message: 'info message' }),
            expect.any(Function)
        );
        expect(vscodeLog).toBeCalledWith(
            expect.objectContaining({ [Symbol.for('level')]: 'info', message: 'info message' }),
            expect.any(Function)
        );
        expect(arrayLog).toBeCalledWith(
            expect.objectContaining({ [Symbol.for('level')]: 'info', message: 'info message' }),
            expect.any(Function)
        );
    });

    it('Calls log method of transport after dynamic addition', () => {
        const consoleLog = jest.spyOn(winston.transports.Console.prototype, 'log');
        const nullLog = jest.spyOn(WinstonNullTransport.prototype, 'log');
        const logger = new ToolsLogger({
            logLevel: LogLevel.Info,
            transports: [new ConsoleTransport()]
        });

        logger.warn('warning1');
        logger.add(new NullTransport());
        logger.error('error1');
        logger.debug('debug1'); // This will be ignored, logger has level Info and above

        expect(consoleLog).toBeCalledTimes(2);
        expect(consoleLog).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ [Symbol.for('level')]: 'warn', message: 'warning1' }),
            expect.any(Function)
        );
        expect(consoleLog).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ [Symbol.for('level')]: 'error', message: 'error1' }),
            expect.any(Function)
        );
        expect(nullLog).toBeCalledTimes(1);
        expect(nullLog).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ [Symbol.for('level')]: 'error', message: 'error1' }),
            expect.any(Function)
        );
    });

    it('Does not call log method of transport after dynamic removal', () => {
        const consoleLog = jest.spyOn(winston.transports.Console.prototype, 'log');
        const nullLog = jest.spyOn(WinstonNullTransport.prototype, 'log');
        const logger = new ToolsLogger({
            logLevel: LogLevel.Debug,
            transports: [new ConsoleTransport(), new NullTransport()]
        });

        logger.warn('warning1');
        const nullTransport = logger.transports().find((t) => t instanceof NullTransport);
        expect(nullTransport).not.toBeUndefined();
        if (nullTransport) {
            logger.remove(nullTransport);
        }
        logger.debug('debug1');

        expect(consoleLog).toBeCalledTimes(2);
        expect(consoleLog).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ [Symbol.for('level')]: 'warn', message: 'warning1' }),
            expect.any(Function)
        );
        expect(consoleLog).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ [Symbol.for('level')]: 'debug', message: 'debug1' }),
            expect.any(Function)
        );
        expect(nullLog).toBeCalledTimes(1);
        expect(nullLog).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ [Symbol.for('level')]: 'warn', message: 'warning1' }),
            expect.any(Function)
        );
    });

    it('Does not call log method of transport if severity level is too low', () => {
        const nullLog = jest.spyOn(WinstonNullTransport.prototype, 'log').mockImplementation(() => 0);
        const logger = new ToolsLogger({
            logLevel: LogLevel.Error,
            transports: [new NullTransport()]
        });

        logger.warn('warning1');
        logger.info('info1');
        logger.error('error1');

        expect(nullLog).toBeCalledTimes(1);
        expect(nullLog).toHaveBeenCalledWith(
            expect.objectContaining({ [Symbol.for('level')]: 'error', message: 'error1' }),
            expect.any(Function)
        );
    });
    describe('log()', () => {
        it('uses the default level if a string is passed in', () => {
            const nullLog = jest.spyOn(WinstonNullTransport.prototype, 'log');
            const logger = new ToolsLogger({
                logLevel: LogLevel.Warn,
                transports: [new NullTransport()]
            });
            logger.log('warning');
            logger.error('error');
            expect(nullLog).toBeCalledTimes(2);
            expect(nullLog).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({ [Symbol.for('level')]: 'warn', message: 'warning' }),
                expect.any(Function)
            );
            expect(nullLog).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ [Symbol.for('level')]: 'error', message: 'error' }),
                expect.any(Function)
            );
        });
        it('uses the level passed in when a Log object is used', () => {
            const nullLog = jest.spyOn(WinstonNullTransport.prototype, 'log');
            const logger = new ToolsLogger({
                transports: [new NullTransport()]
            });
            logger.log({ level: LogLevel.Error, message: 'error1' });
            logger.error('error2');
            logger.log({ level: LogLevel.Silly, message: 'not silly' });
            expect(nullLog).toBeCalledTimes(2);
            expect(nullLog).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({ [Symbol.for('level')]: 'error', message: 'error1' }),
                expect.any(Function)
            );
            expect(nullLog).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ [Symbol.for('level')]: 'error', message: 'error2' }),
                expect.any(Function)
            );
        });
    });
    describe('child loggers', () => {
        it('new instances are returned per call', () => {
            const logger = new ToolsLogger({
                transports: [new NullTransport()]
            });
            const childLogger1 = logger.child({ logPrefix: 'child1' });
            const childLogger2 = logger.child({ logPrefix: 'child1' });
            expect(childLogger1).not.toBe(childLogger2);
        });
        it('have access to the same transports as the parent', () => {
            const nullTransport = new NullTransport();
            const logger = new ToolsLogger({
                transports: [nullTransport]
            });
            const childLogger1 = logger.child({ logPrefix: 'child1' });
            childLogger1.remove(nullTransport);
            expect(childLogger1.transports()).toBeEmpty();
            expect(logger.transports()).toBeEmpty();
        });
    });
});
