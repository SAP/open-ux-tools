import portfinder from 'portfinder';

import type { ToolsLogger } from '@sap-ux/logger';

import { mergeEffectiveOptions } from '../../../src/config';
import { parseDestinationsFromEnv, resolveDestinations, nextFreePort } from '../../../src/destinations';

describe('destinations', () => {
    const logger = { info: jest.fn(), warn: jest.fn() } as unknown as ToolsLogger;

    describe('parseDestinationsFromEnv', () => {
        test('returns undefined when process.env.destinations is not set', () => {
            delete process.env.destinations;
            expect(parseDestinationsFromEnv()).toBeUndefined();
        });

        test('returns parsed array when process.env.destinations is valid JSON', () => {
            process.env.destinations = JSON.stringify([{ name: 'system1', url: '/system1' }]);
            expect(parseDestinationsFromEnv()).toEqual([{ name: 'system1', url: '/system1' }]);
            delete process.env.destinations;
        });

        test('returns undefined when process.env.destinations is invalid JSON', () => {
            process.env.destinations = 'not json';
            expect(parseDestinationsFromEnv()).toBeUndefined();
            delete process.env.destinations;
        });
    });

    describe('resolveDestinations', () => {
        beforeEach(() => {
            delete process.env.destinations;
        });

        test('returns array from effectiveOptions when no env destinations', () => {
            const dests = [{ name: 'backend', url: 'http://localhost:8080' }];
            const opts = mergeEffectiveOptions({ xsappJsonPath: './xs-app.json', destinations: dests });
            expect(resolveDestinations(opts)).toEqual(dests);
        });

        test('throws when $env:VAR is set but variable not in process.env', () => {
            const opts = mergeEffectiveOptions({ xsappJsonPath: './xs-app.json', destinations: '$env:MISSING_VAR' });
            expect(() => resolveDestinations(opts)).toThrow(/MISSING_VAR/);
        });

        test('throws when $env:VAR exists but value is invalid JSON', () => {
            process.env.DEST_VAR = 'not valid json';
            const opts = mergeEffectiveOptions({ xsappJsonPath: './xs-app.json', destinations: '$env:DEST_VAR' });
            expect(() => resolveDestinations(opts)).toThrow(/No valid destinations JSON in .env at 'DEST_VAR'/);
            delete process.env.DEST_VAR;
        });

        test('returns parsed array when $env:VAR exists with valid JSON', () => {
            const dests = [{ name: 'backend', url: 'http://localhost:8080' }];
            process.env.DEST_VAR = JSON.stringify(dests);
            const opts = mergeEffectiveOptions({ xsappJsonPath: './xs-app.json', destinations: '$env:DEST_VAR' });
            expect(resolveDestinations(opts)).toEqual(dests);
            delete process.env.DEST_VAR;
        });
    });

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
