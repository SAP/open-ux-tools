import { join } from 'node:path';
import * as nodeFs from 'node:fs';
import { waitForMtaFile } from '../../src/mta-config/wait-for-mta';

jest.mock('@sap/mta-lib', () => ({
    Mta: jest.fn()
}));

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn()
}));

const mockExistsSync = nodeFs.existsSync as jest.Mock;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Mta } = require('@sap/mta-lib');

describe('waitForMtaFile', () => {
    const mtaPath = '/fake/project';
    const mtaFilePath = join(mtaPath, 'mta.yaml');

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('resolves immediately when mta.yaml exists and has an ID', async () => {
        // Given: file exists and Mta returns an ID
        mockExistsSync.mockImplementation((p: string) => p === mtaFilePath);
        Mta.mockImplementation(() => ({
            getMtaID: jest.fn().mockResolvedValue('my-app')
        }));

        // When: waitForMtaFile is called
        const promise = waitForMtaFile(mtaPath, { maxWaitMs: 1000, pollIntervalMs: 50 });
        await jest.runAllTimersAsync();

        // Then: resolves without throwing
        await expect(promise).resolves.toBeUndefined();
    });

    it('polls until the file appears, then resolves', async () => {
        // Given: file is absent for the first two polls, then present
        let callCount = 0;
        mockExistsSync.mockImplementation((p: string) => {
            if (p !== mtaFilePath) {
                return false;
            }
            callCount++;
            return callCount >= 3;
        });
        Mta.mockImplementation(() => ({
            getMtaID: jest.fn().mockResolvedValue('my-app')
        }));

        // When
        const promise = waitForMtaFile(mtaPath, { maxWaitMs: 5000, pollIntervalMs: 50 });
        await jest.runAllTimersAsync();

        // Then: eventually resolves
        await expect(promise).resolves.toBeUndefined();
        expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('retries when Mta constructor throws, then resolves once it succeeds', async () => {
        // Given: file exists but Mta throws initially, succeeds on third attempt
        mockExistsSync.mockImplementation((p: string) => p === mtaFilePath);
        let mtaCallCount = 0;
        Mta.mockImplementation(() => {
            mtaCallCount++;
            if (mtaCallCount < 3) {
                return { getMtaID: jest.fn().mockRejectedValue(new Error('not ready')) };
            }
            return { getMtaID: jest.fn().mockResolvedValue('my-app') };
        });

        // When
        const promise = waitForMtaFile(mtaPath, { maxWaitMs: 5000, pollIntervalMs: 50 });
        await jest.runAllTimersAsync();

        // Then
        await expect(promise).resolves.toBeUndefined();
        expect(mtaCallCount).toBe(3);
    });

    it('retries when getMtaID returns empty/falsy, then resolves', async () => {
        // Given: getMtaID returns undefined on first call, id on second
        mockExistsSync.mockImplementation((p: string) => p === mtaFilePath);
        let idCallCount = 0;
        Mta.mockImplementation(() => ({
            getMtaID: jest.fn().mockImplementation(async () => {
                idCallCount++;
                return idCallCount < 2 ? undefined : 'my-app';
            })
        }));

        // When
        const promise = waitForMtaFile(mtaPath, { maxWaitMs: 5000, pollIntervalMs: 50 });
        await jest.runAllTimersAsync();

        // Then
        await expect(promise).resolves.toBeUndefined();
        expect(idCallCount).toBe(2);
    });

    it('throws when maxWaitMs is exceeded without the file becoming ready', async () => {
        // Given: file never appears
        mockExistsSync.mockReturnValue(false);

        // When: start the call and attach a rejection handler immediately to prevent unhandled rejection
        const promise = waitForMtaFile(mtaPath, { maxWaitMs: 200, pollIntervalMs: 50 });
        // Attach a no-op catch to prevent unhandled rejection warning while timers run
        promise.catch(() => undefined);
        await jest.runAllTimersAsync();

        // Then
        await expect(promise).rejects.toThrow(mtaPath);
    });

    it('uses default options when none are supplied', async () => {
        // Given: file exists from the start
        mockExistsSync.mockImplementation((p: string) => p === mtaFilePath);
        Mta.mockImplementation(() => ({
            getMtaID: jest.fn().mockResolvedValue('my-app')
        }));

        // When: no options passed (uses defaults: maxWaitMs=5000, pollIntervalMs=100)
        const promise = waitForMtaFile(mtaPath);
        await jest.runAllTimersAsync();

        // Then
        await expect(promise).resolves.toBeUndefined();
    });
});
