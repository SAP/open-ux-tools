import {
    FlexLayer,
    addSnapshot,
    buildSystemVersionLabel,
    isFeatureSupportedVersion,
    removeTimestampFromVersion
} from '../../../src';
import { UI5VersionInfo } from '../../../src/ui5/version-info';
import { fetchPublicVersions, fetchInternalVersions } from '../../../src/ui5/fetch';
import { SNAPSHOT_UNTESTED_VERSION, SNAPSHOT_VERSION } from '../../../src/base/constants';

jest.mock('../../../src/ui5/fetch', () => ({
    fetchPublicVersions: jest.fn(),
    fetchInternalVersions: jest.fn()
}));

jest.mock('../../../src/ui5/format', () => ({
    removeTimestampFromVersion: jest.fn(),
    addSnapshot: jest.fn(),
    buildSystemVersionLabel: jest.fn(),
    isFeatureSupportedVersion: jest.fn()
}));

const mockPublicVersions = {
    latest: { version: '1.120.0' },
    '1.120.0': { version: '1.120.0' },
    '1.119.1': { version: '1.119.1' },
    '1.119.0': { version: '1.119.0' }
};

const mockInternalVersions = ['1.120.0', '1.119.1', '1.119.0'];

const fetchPublicVersionsMock = fetchPublicVersions as jest.Mock;
const fetchInternalVersionsMock = fetchInternalVersions as jest.Mock;

const addSnapshotMock = addSnapshot as jest.Mock;
const buildSystemVersionLabelMock = buildSystemVersionLabel as jest.Mock;
const isFeatureSupportedVersionMock = isFeatureSupportedVersion as jest.Mock;
const removeTimestampFromVersionMock = removeTimestampFromVersion as jest.Mock;

describe('UI5VersionInfo', () => {
    const manager = UI5VersionInfo.getInstance(FlexLayer.CUSTOMER_BASE);

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        fetchPublicVersionsMock.mockResolvedValue(mockPublicVersions);
        fetchInternalVersionsMock.mockResolvedValue(mockInternalVersions);

        removeTimestampFromVersionMock.mockImplementation((v) => v);
        addSnapshotMock.mockReturnValue('');
        buildSystemVersionLabelMock.mockReturnValue('1.119.1 (system version)');
        isFeatureSupportedVersionMock.mockReturnValue(true);
    });

    describe('getVersionToBeUsed', () => {
        it('should return latest version when snapshot is in version and isCustomerBase is true', async () => {
            await manager.getPublicVersions();
            const version = manager.getVersionToBeUsed('1.119.0 snapshot', true);
            expect(version).toBe('1.120.0');
        });

        it('should return the given version if not snapshot', async () => {
            await manager.getPublicVersions();
            const version = manager.getVersionToBeUsed('1.118.5', false);
            expect(version).toBe('1.118.5');
        });
    });

    describe('getPublicVersions', () => {
        it('should return publicVersions and set latestVersion', async () => {
            const versions = await manager.getPublicVersions();
            expect(versions).toEqual(mockPublicVersions);
            expect(manager.getLatestVersion()).toBe('1.120.0');
        });
    });

    describe('getInternalVersions', () => {
        it('should return internal versions filtered by feature support', async () => {
            const result = await (manager as any).getInternalVersions('1.120.0');
            expect(result).toEqual(mockInternalVersions);
            expect(fetchInternalVersionsMock).toHaveBeenCalledWith('1.120.0');
        });
    });

    describe('getRelevantVersions', () => {
        it('should return formatted versions list for internal user', async () => {
            (manager as any).isCustomerBase = false;

            const result = await manager.getRelevantVersions('1.119.1');
            (manager as any).isCustomerBase = true;

            expect(result).toContain(SNAPSHOT_VERSION);
            expect(result).toContain(SNAPSHOT_UNTESTED_VERSION);
            expect(result).toContain('1.119.1 (system version)');
            expect(result).toContain('1.120.0');
        });

        it('should return only public latest version for customer base with no version', async () => {
            const result = await manager.getRelevantVersions(undefined);
            expect(result).toEqual(['1.120.0 (latest)']);
        });

        it('should return higher versions for customer base with version provided and snapshot label empty', async () => {
            const result = await manager.getRelevantVersions('1.118.0');
            expect(result.some((v) => v.includes('1.119'))).toBeTruthy();
            expect(result).toContain('1.119.1');
        });
    });

    describe('getHigherVersions', () => {
        it('should handle getHigherVersions correctly', async () => {
            const result = await (manager as any).getHigherVersions('1.118.0');
            expect(result).toContain('1.119.0');
            expect(result).toContain('1.119.1');
        });
    });

    describe('Utility method usage', () => {
        it('should call utility methods as expected', async () => {
            await manager.getRelevantVersions('1.118.0');

            expect(removeTimestampFromVersionMock).toHaveBeenCalled();
            expect(buildSystemVersionLabelMock).toHaveBeenCalled();
        });
    });
});
