import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';

const mockGetPortPromise = jest.fn<() => Promise<number>>();

jest.unstable_mockModule('portfinder', () => ({
    default: { getPortPromise: mockGetPortPromise, basePort: 0 },
    getPortPromise: mockGetPortPromise
}));

const { nextFreePort } = await import('../../src/utils');

describe('utils', () => {
    const logger = { info: jest.fn(), warn: jest.fn() } as unknown as ToolsLogger;

    describe('nextFreePort', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('returns port from portfinder when successful', async () => {
            mockGetPortPromise.mockResolvedValue(5010);
            const port = await nextFreePort(5000, logger);
            expect(port).toBe(5010);
        });

        test('returns basePort when portfinder throws', async () => {
            mockGetPortPromise.mockRejectedValue(new Error('no port'));
            const port = await nextFreePort(5000, logger);
            expect(port).toBe(5000);
            expect(logger.warn).toHaveBeenCalledWith('portfinder failed, using base port 5000.');
        });
    });
});
