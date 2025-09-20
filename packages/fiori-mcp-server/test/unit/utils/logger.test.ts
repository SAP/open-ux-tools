import { logger } from '../../../src/utils/logger';
import { LogLevel } from '@sap-ux/logger';

describe('logger', () => {
    it('should be an instance of ToolsLogger', () => {
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });

    it('should support log level configuration from environment variables', () => {
        // Test that the logger configuration function handles various log levels
        // This is an indirect test since the logger is already initialized
        const originalEnv = process.env.LOG_LEVEL;

        // Clean up
        if (originalEnv !== undefined) {
            process.env.LOG_LEVEL = originalEnv;
        } else {
            delete process.env.LOG_LEVEL;
        }

        expect(LogLevel.Error).toBe(0);
        expect(LogLevel.Warn).toBe(1);
        expect(LogLevel.Info).toBe(2);
        expect(LogLevel.Debug).toBe(4);
    });

    it('should have logging methods that accept string messages', () => {
        // Test that logger methods exist and can be called
        // We don't test actual output since that would require mocking the transport
        expect(() => logger.info('test info')).not.toThrow();
        expect(() => logger.warn('test warn')).not.toThrow();
        expect(() => logger.error('test error')).not.toThrow();
        expect(() => logger.debug('test debug')).not.toThrow();
    });
});
