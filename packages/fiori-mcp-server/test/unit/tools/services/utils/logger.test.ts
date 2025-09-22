import { LogLevel, logger } from '../../../../../src/tools/services/utils/logger';

describe('logger', () => {
    let consoleSpy: {
        log: jest.SpyInstance;
        error: jest.SpyInstance;
        warn: jest.SpyInstance;
        info: jest.SpyInstance;
    };

    beforeEach(() => {
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            info: jest.spyOn(console, 'info').mockImplementation()
        };
    });

    afterEach(() => {
        consoleSpy.log.mockRestore();
        consoleSpy.error.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.info.mockRestore();
    });

    describe('LogLevel enum', () => {
        it('should have correct values', () => {
            expect(LogLevel.NONE).toBe(0);
            expect(LogLevel.ERROR).toBe(1);
            expect(LogLevel.WARN).toBe(2);
            expect(LogLevel.INFO).toBe(3);
            expect(LogLevel.DEBUG).toBe(4);
        });
    });

    describe('logger methods', () => {
        describe('with LOG_LEVEL environment variable', () => {
            const originalEnv = process.env.LOG_LEVEL;

            afterAll(() => {
                if (originalEnv) {
                    process.env.LOG_LEVEL = originalEnv;
                } else {
                    delete process.env.LOG_LEVEL;
                }
            });

            it('should log when level is DEBUG', () => {
                process.env.LOG_LEVEL = 'DEBUG';

                // Re-require the module to pick up new env var
                jest.resetModules();
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { logger: newLogger } = require('../../../../../src/tools/services/utils/logger');

                newLogger.log('test message', 'arg1', 'arg2');
                newLogger.error('error message');
                newLogger.warn('warn message');
                newLogger.info('info message');

                expect(consoleSpy.log).toHaveBeenCalledWith('test message', 'arg1', 'arg2');
                expect(consoleSpy.error).toHaveBeenCalledWith('error message');
                expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
                expect(consoleSpy.info).toHaveBeenCalledWith('info message');
            });

            it('should not log when level is NONE', () => {
                process.env.LOG_LEVEL = 'NONE';

                jest.resetModules();
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { logger: newLogger } = require('../../../../../src/tools/services/utils/logger');

                newLogger.log('test message');
                newLogger.error('error message');
                newLogger.warn('warn message');
                newLogger.info('info message');

                expect(consoleSpy.log).not.toHaveBeenCalled();
                expect(consoleSpy.error).not.toHaveBeenCalled();
                expect(consoleSpy.warn).not.toHaveBeenCalled();
                expect(consoleSpy.info).not.toHaveBeenCalled();
            });

            it('should only log error messages when level is ERROR', () => {
                process.env.LOG_LEVEL = 'ERROR';

                jest.resetModules();
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { logger: newLogger } = require('../../../../../src/tools/services/utils/logger');

                newLogger.log('test message');
                newLogger.error('error message');
                newLogger.warn('warn message');
                newLogger.info('info message');

                expect(consoleSpy.log).not.toHaveBeenCalled();
                expect(consoleSpy.error).toHaveBeenCalledWith('error message');
                expect(consoleSpy.warn).not.toHaveBeenCalled();
                expect(consoleSpy.info).not.toHaveBeenCalled();
            });

            it('should log error and warn messages when level is WARN', () => {
                process.env.LOG_LEVEL = 'WARN';

                jest.resetModules();
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { logger: newLogger } = require('../../../../../src/tools/services/utils/logger');

                newLogger.log('test message');
                newLogger.error('error message');
                newLogger.warn('warn message');
                newLogger.info('info message');

                expect(consoleSpy.log).not.toHaveBeenCalled();
                expect(consoleSpy.error).toHaveBeenCalledWith('error message');
                expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
                expect(consoleSpy.info).not.toHaveBeenCalled();
            });

            it('should log error, warn, and info messages when level is INFO', () => {
                process.env.LOG_LEVEL = 'INFO';

                jest.resetModules();
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { logger: newLogger } = require('../../../../../src/tools/services/utils/logger');

                newLogger.log('test message');
                newLogger.error('error message');
                newLogger.warn('warn message');
                newLogger.info('info message');

                expect(consoleSpy.log).not.toHaveBeenCalled();
                expect(consoleSpy.error).toHaveBeenCalledWith('error message');
                expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
                expect(consoleSpy.info).toHaveBeenCalledWith('info message');
            });

            it('should handle invalid log level gracefully', () => {
                process.env.LOG_LEVEL = 'INVALID';

                jest.resetModules();
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { logger: newLogger } = require('../../../../../src/tools/services/utils/logger');

                newLogger.log('test message');
                newLogger.error('error message');

                expect(consoleSpy.log).not.toHaveBeenCalled();
                expect(consoleSpy.error).not.toHaveBeenCalled();
            });
        });

        describe('with command line arguments', () => {
            const originalArgv = process.argv;

            afterEach(() => {
                process.argv = originalArgv;
            });

            it('should use command line log level', () => {
                process.argv = ['node', 'script.js', '--log-level=ERROR'];
                delete process.env.LOG_LEVEL;

                jest.resetModules();
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { logger: newLogger } = require('../../../../../src/tools/services/utils/logger');

                newLogger.error('error message');
                newLogger.warn('warn message');

                expect(consoleSpy.error).toHaveBeenCalledWith('error message');
                expect(consoleSpy.warn).not.toHaveBeenCalled();
            });
        });

        describe('with global log level', () => {
            it('should use global log level when available', () => {
                (global as any).LOG_LEVEL = 'WARN';
                delete process.env.LOG_LEVEL;

                jest.resetModules();
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { logger: newLogger } = require('../../../../../src/tools/services/utils/logger');

                newLogger.warn('warn message');
                newLogger.info('info message');

                expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
                expect(consoleSpy.info).not.toHaveBeenCalled();

                delete (global as any).LOG_LEVEL;
            });
        });
    });
});
