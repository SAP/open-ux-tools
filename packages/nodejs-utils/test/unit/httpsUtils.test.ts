import { setGlobalRejectUnauthorized } from '../../src/httpsUtils';
import https from 'node:https';

describe('httpsUtils tests', () => {
    it('should set global https reject unauthorized', () => {
        // Mocking the fallbackAgent for testing purposes
        (https.globalAgent as any).fallbackAgent = {
            options: {
                rejectUnauthorized: true
            }
        };
        setGlobalRejectUnauthorized(false);
        expect(https.globalAgent.options.rejectUnauthorized).toBe(false);
        expect((https.globalAgent as any).fallbackAgent.options.rejectUnauthorized).toBe(false);
        setGlobalRejectUnauthorized(true);
        expect(https.globalAgent.options.rejectUnauthorized).toBe(true);
        expect((https.globalAgent as any).fallbackAgent.options.rejectUnauthorized).toBe(true);
    });
});
