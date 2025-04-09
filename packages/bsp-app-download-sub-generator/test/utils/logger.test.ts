import BspAppDownloadLogger from '../../src/utils/logger';
import { DefaultLogger, LogWrapper } from '@sap-ux/fiori-generator-shared';
import type { Logger } from 'yeoman-environment';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';

describe('BspAppDownloadLogger', () => {
    const testLoggerName = 'testLogger';
    afterEach(() => {
        // Reset the logger to the default after each test
        BspAppDownloadLogger.logger = DefaultLogger;
    });

    it('should return the default logger initially', () => {
        expect(BspAppDownloadLogger.logger).toBe(DefaultLogger);
    });

    it('should allow setting a custom logger', () => {
        const mockLogger = { log: jest.fn() } as unknown as LogWrapper;
        BspAppDownloadLogger.logger = mockLogger;
        expect(BspAppDownloadLogger.logger).toBe(mockLogger);
    });

    it('should configure the logger with provided parameters', () => {
        const mockYoLogger = { log: jest.fn() } as unknown as Logger;
        const mockLogWrapper = { log: jest.fn() } as unknown as LogWrapper;

        BspAppDownloadLogger.configureLogging(testLoggerName, mockYoLogger, mockLogWrapper);

        expect(BspAppDownloadLogger.logger).toBe(mockLogWrapper);
    });

    it('should create a new LogWrapper if none is provided', () => {
        const mockYoLogger = { log: jest.fn() } as unknown as Logger;
        const mockLogLevel: LogLevel = 'info';
        const mockVscLogger = { 
            log: jest.fn(),
            debug: jest.fn(),
            getChildLogger: jest.fn().mockReturnValue({ 
                log: jest.fn(),
                debug: jest.fn()
            })
        } as unknown as IVSCodeExtLogger;

        BspAppDownloadLogger.configureLogging(testLoggerName, mockYoLogger, undefined, mockLogLevel, mockVscLogger);
        expect(BspAppDownloadLogger.logger).toBeInstanceOf(LogWrapper);
    });
});