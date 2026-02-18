import fs from 'node:fs';
import path from 'node:path';

import { applyDestinationsToEnv, loadAndApplyEnvOptions } from '../../../src/env';

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

const existsSyncMock = fs.existsSync as jest.Mock;
const readFileSyncMock = fs.readFileSync as jest.Mock;

describe('env', () => {
    describe('applyDestinationsToEnv', () => {
        test('sets process.env.destinations when non-empty array', () => {
            const dests = [{ name: 'system1', url: '/system1' }];
            applyDestinationsToEnv(dests);
            expect(process.env.destinations).toBe(JSON.stringify(dests));
            delete process.env.destinations;
        });

        test('deletes process.env.destinations when undefined', () => {
            process.env.destinations = '[]';
            applyDestinationsToEnv(undefined);
            expect(process.env.destinations).toBeUndefined();
        });
    });

    describe('loadAndApplyEnvOptions', () => {
        const rootPath = path.join(__dirname, '../../fixtures/env');

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('throws when file does not exist', () => {
            existsSyncMock.mockReturnValue(false);
            expect(() => loadAndApplyEnvOptions(rootPath, 'missing.json')).toThrow(/Env options file not found/);
        });

        test('throws when file is invalid JSON', () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue('not json');
            expect(() => loadAndApplyEnvOptions(rootPath, 'bad.json')).toThrow(/Failed to read env options/);
        });

        test('applies VCAP_SERVICES as string to process.env', () => {
            const opts = { VCAP_SERVICES: { xsuaa: [] } };

            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(JSON.stringify(opts));

            const before = process.env.VCAP_SERVICES;

            loadAndApplyEnvOptions(rootPath, 'opts.json');
            expect(process.env.VCAP_SERVICES).toBe(JSON.stringify(opts.VCAP_SERVICES));

            if (before !== undefined) {
                process.env.VCAP_SERVICES = before;
            } else {
                delete process.env.VCAP_SERVICES;
            }
        });
    });
});
