import portfinder from 'portfinder';

import type { ToolsLogger } from '@sap-ux/logger';

import { nextFreePort } from '../../../src/utils';

describe('utils', () => {
    const logger = { info: jest.fn(), warn: jest.fn() } as unknown as ToolsLogger;

    describe('nextFreePort', () => {
        test('returns port from portfinder when successful', async () => {
            jest.spyOn(portfinder, 'getPortPromise').mockResolvedValue(5010);
            const port = await nextFreePort(5000, logger);
            expect(port).toBe(5010);
        });

        test('returns basePort when portfinder throws', async () => {
            jest.spyOn(portfinder, 'getPortPromise').mockRejectedValue(new Error('no port'));
            const port = await nextFreePort(5000, logger);
            expect(port).toBe(5000);
            expect(logger.warn).toHaveBeenCalledWith('portfinder failed, using base port 5000.');
        });
    });
});
