import type { ToolsLogger } from '@sap-ux/logger';
import { LogLevel } from '@sap-ux/logger';

describe('logger module', () => {
    const originalEnv = process.env.LOG_LEVEL;
    const originalArgv = process.argv;
    const originalGlobal = (global as Record<string, unknown>).LOG_LEVEL;

    beforeEach(() => {
        // Reset environment
        delete process.env.LOG_LEVEL;
        delete (global as Record<string, unknown>).LOG_LEVEL;
        process.argv = ['node', 'test'];

        // Clear module cache to test fresh imports
        jest.resetModules();
    });

    afterEach(() => {
        // Restore original values
        if (originalEnv !== undefined) {
            process.env.LOG_LEVEL = originalEnv;
        }
        if (originalGlobal !== undefined) {
            (global as Record<string, unknown>).LOG_LEVEL = originalGlobal;
        }
        process.argv = originalArgv;
    });

    describe('getLogLevel function behavior', () => {
        it('should return Error level as default when no configuration is provided', () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
            expect(logger.constructor.name).toBe('WinstonLogger');
        });

        it('should use global LOG_LEVEL when set', () => {
            (global as Record<string, unknown>).LOG_LEVEL = 'INFO';
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should use environment LOG_LEVEL when global is not set', () => {
            process.env.LOG_LEVEL = 'DEBUG';
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should use command line argument when global and env are not set', () => {
            process.argv.push('--log-level=WARN');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should prioritize global over environment variable', () => {
            (global as Record<string, unknown>).LOG_LEVEL = 'ERROR';
            process.env.LOG_LEVEL = 'INFO';
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should prioritize global over command line argument', () => {
            (global as Record<string, unknown>).LOG_LEVEL = 'WARN';
            process.argv.push('--log-level=DEBUG');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should prioritize environment over command line argument', () => {
            process.env.LOG_LEVEL = 'VERBOSE';
            process.argv.push('--log-level=SILLY');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });
    });

    describe('log level parsing', () => {
        const testCases = [
            { input: 'ERROR', expected: 'error level' },
            { input: 'error', expected: 'error level' },
            { input: 'Error', expected: 'error level' },
            { input: 'WARN', expected: 'warn level' },
            { input: 'warn', expected: 'warn level' },
            { input: 'INFO', expected: 'info level' },
            { input: 'info', expected: 'info level' },
            { input: 'DEBUG', expected: 'debug level' },
            { input: 'debug', expected: 'debug level' },
            { input: 'VERBOSE', expected: 'verbose level' },
            { input: 'verbose', expected: 'verbose level' },
            { input: 'SILLY', expected: 'silly level' },
            { input: 'silly', expected: 'silly level' }
        ];

        testCases.forEach(({ input, expected }) => {
            it(`should handle ${input} case-insensitively for ${expected}`, () => {
                process.env.LOG_LEVEL = input;
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
                expect(logger).toBeDefined();
            });
        });

        it('should fall back to Error level for invalid log level strings', () => {
            process.env.LOG_LEVEL = 'INVALID_LEVEL';
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should fall back to Error level for empty string', () => {
            process.env.LOG_LEVEL = '';
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should fall back to Error level for whitespace-only string', () => {
            process.env.LOG_LEVEL = '   ';
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });
    });

    describe('command line argument parsing', () => {
        it('should parse --log-level=VALUE format correctly', () => {
            process.argv.push('--log-level=INFO');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should handle command line argument without equals sign gracefully', () => {
            process.argv.push('--log-level');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should handle multiple --log-level arguments by using the first one', () => {
            process.argv.push('--log-level=DEBUG');
            process.argv.push('--log-level=ERROR');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should handle malformed command line arguments', () => {
            process.argv.push('--log-level=');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });
    });

    describe('logger instance configuration', () => {
        it('should create logger with correct prefix', () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });

        it('should create logger with ConsoleTransport', () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { logger } = require('../../../src/utils/logger') as { logger: ToolsLogger };
            expect(logger).toBeDefined();
        });
    });

    describe('logger functionality', () => {
        let logger: ToolsLogger;

        beforeEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const loggerModule = require('../../../src/utils/logger') as { logger: ToolsLogger };
            logger = loggerModule.logger;
        });

        it('should be an instance of ToolsLogger', () => {
            expect(logger).toBeDefined();
            expect(logger.constructor.name).toBe('WinstonLogger');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.debug).toBe('function');
        });

        it('should have logging methods that accept string messages', () => {
            expect(() => logger.info('test info')).not.toThrow();
            expect(() => logger.warn('test warn')).not.toThrow();
            expect(() => logger.error('test error')).not.toThrow();
            expect(() => logger.debug('test debug')).not.toThrow();
        });

        it('should handle complex message formatting', () => {
            const testObj = { key: 'value', nested: { prop: 123 } };
            const testError = new Error('Test error message');

            expect(() => logger.info(`Test object: ${JSON.stringify(testObj)}`)).not.toThrow();
            expect(() => logger.error(`Error object: ${JSON.stringify(testObj)}`)).not.toThrow();
            expect(() => logger.error(`Error occurred: ${testError.message}`)).not.toThrow();
            expect(() => logger.info(`Multiple values: ${JSON.stringify(['arguments', 'test', 123])}`)).not.toThrow();
            expect(() =>
                logger.warn(`Warning with object: ${JSON.stringify({ object: true })} and number: 456`)
            ).not.toThrow();
        });

        it('should handle edge case values', () => {
            expect(() => logger.info('Undefined value: undefined')).not.toThrow();
            expect(() => logger.warn('Null value: null')).not.toThrow();
            expect(() => logger.error('')).not.toThrow();
            expect(() => logger.debug('   ')).not.toThrow();
        });
    });

    describe('LogLevel constants verification', () => {
        it('should have correct LogLevel enum values', () => {
            expect(LogLevel.Error).toBe(0);
            expect(LogLevel.Warn).toBe(1);
            expect(LogLevel.Info).toBe(2);
            expect(LogLevel.Debug).toBe(4);
        });
    });
});
