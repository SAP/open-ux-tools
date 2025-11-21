import { formatUi5Version, addSnapshot, buildSystemVersionLabel } from '../../../src/ui5/format';
import {
    getLatestVersion,
    getVersionToBeUsed,
    getVersionLabels,
    checkSystemVersionPattern,
    getInternalVersions,
    getHigherVersions,
    getRelevantVersions,
    shouldSetMinUI5Version,
    getMinUI5VersionForManifest
} from '../../../src/ui5/version-info';
import type { UI5Version } from '../../../src';
import { fetchInternalVersions } from '../../../src/ui5/fetch';
import {
    CURRENT_SYSTEM_VERSION,
    LATEST_VERSION,
    SNAPSHOT_UNTESTED_VERSION,
    SNAPSHOT_VERSION
} from '../../../src/base/constants';

jest.mock('../../../src/ui5/fetch', () => ({
    fetchInternalVersions: jest.fn()
}));

jest.mock('../../../src/ui5/format', () => ({
    ...jest.requireActual('../../../src/ui5/format'),
    formatUi5Version: jest.fn(),
    removeTimestampFromVersion: jest.fn(),
    addSnapshot: jest.fn(),
    buildSystemVersionLabel: jest.fn()
}));

const mockPublicVersions = {
    latest: { version: '1.120.0' },
    '1.120.0': { version: '1.120.0' },
    '1.119.1': { version: '1.119.1' },
    '1.119.0': { version: '1.119.0' }
} as unknown as UI5Version;

const mockInternalVersions = ['1.120.0', '1.119.1', '1.119.0', '1.64.0'];

const fetchInternalVersionsMock = fetchInternalVersions as jest.Mock;
const addSnapshotMock = addSnapshot as jest.Mock;
const buildSystemVersionLabelMock = buildSystemVersionLabel as jest.Mock;
const formatUi5VersionMock = formatUi5Version as jest.Mock;

describe('Version Info', () => {
    beforeEach(() => {
        fetchInternalVersionsMock.mockResolvedValue(mockInternalVersions);
        formatUi5VersionMock.mockImplementation((v) => v);
        addSnapshotMock.mockReturnValue('');
        buildSystemVersionLabelMock.mockReturnValue('1.119.1 (system version)');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('getLatestVersion', () => {
        it('should return the latest version from public versions', () => {
            const result = getLatestVersion(mockPublicVersions);
            expect(result).toBe('1.120.0');
        });
    });

    describe('getMinUI5VersionForManifest', () => {
        const publicVersions: UI5Version = {
            latest: { version: '1.135.0' }
        } as UI5Version;

        it('returns the systemVersion when it is defined and contains no snapshot', () => {
            expect(getMinUI5VersionForManifest(publicVersions, '1.120.0')).toBe('1.120.0');
            expect(getMinUI5VersionForManifest(publicVersions, '2.5.3')).toBe('2.5.3');
        });

        it('falls back to latest when systemVersion is undefined', () => {
            expect(getMinUI5VersionForManifest(publicVersions)).toBe('1.135.0');
            expect(getMinUI5VersionForManifest(publicVersions, undefined)).toBe('1.135.0');
        });

        it('falls back to latest when systemVersion is an empty string', () => {
            expect(getMinUI5VersionForManifest(publicVersions, '')).toBe('1.135.0');
        });

        it('falls back to latest when systemVersion includes "snapshot"', () => {
            expect(getMinUI5VersionForManifest(publicVersions, '1.120.0-snapshot')).toBe('1.135.0');
            expect(getMinUI5VersionForManifest(publicVersions, 'snapshot')).toBe('1.135.0');
        });
    });

    describe('shouldSetMinUI5Version', () => {
        it('returns false if systemVersion is undefined', () => {
            expect(shouldSetMinUI5Version(undefined)).toBe(false);
        });

        it('returns false if minor version < 90', () => {
            expect(shouldSetMinUI5Version('1.89.5')).toBe(false);
            expect(shouldSetMinUI5Version('1.0.0')).toBe(false);
        });

        it('returns true if minor version = 90', () => {
            expect(shouldSetMinUI5Version('1.90.0')).toBe(true);
        });

        it('returns true if minor version > 90', () => {
            expect(shouldSetMinUI5Version('1.100.2')).toBe(true);
            expect(shouldSetMinUI5Version('2.135.0')).toBe(true);
        });

        it('returns false if version string is malformed', () => {
            expect(shouldSetMinUI5Version('1')).toBe(false);
            expect(shouldSetMinUI5Version('1.x.2')).toBe(false);
        });
    });

    describe('getVersionToBeUsed', () => {
        it('should return the latest version when version is empty', () => {
            const result = getVersionToBeUsed('', false, mockPublicVersions);
            expect(result).toBe('1.120.0');
        });

        it('should return the latest version when isCustomerBase is true and version contains "snapshot"', () => {
            const result = getVersionToBeUsed('1.119.1-snapshot', true, mockPublicVersions);
            expect(result).toBe('1.120.0');
        });

        it('should return the provided version when conditions do not trigger a change', () => {
            const result = getVersionToBeUsed('1.119.1', true, mockPublicVersions);
            expect(result).toBe('1.119.1');
        });

        it('should return the provided version when not a customer base', () => {
            const result = getVersionToBeUsed('1.119.1', false, mockPublicVersions);
            expect(result).toBe('1.119.1');
        });
    });

    describe('getVersionLabels', () => {
        it('should return empty labels when version is undefined', () => {
            const result = getVersionLabels(undefined, mockPublicVersions);
            expect(result).toEqual({
                formattedVersion: '',
                systemSnapshotLabel: '',
                systemLatestLabel: ''
            });
        });

        it('should compute version labels correctly for a non-latest version', () => {
            formatUi5VersionMock.mockImplementation((v) => v.split('-')?.[0]);
            addSnapshotMock.mockReturnValue('-snapshot');

            const version = '1.119.1-snapshot';
            const result = getVersionLabels(version, mockPublicVersions);

            expect(formatUi5VersionMock).toHaveBeenCalledWith(version);
            expect(addSnapshotMock).toHaveBeenCalledWith(version, '1.120.0');
            // Since the formatted version ('1.119.1') does not match the latest ('1.120.0'),
            // systemLatestLabel should be an empty string.
            expect(result).toEqual({
                formattedVersion: '1.119.1',
                systemSnapshotLabel: '-snapshot',
                systemLatestLabel: ''
            });
        });

        it('should set systemLatestLabel when formatted version equals the latest version', () => {
            formatUi5VersionMock.mockReturnValue('1.120.0');
            addSnapshotMock.mockReturnValue('');
            const version = '1.120.0';
            const result = getVersionLabels(version, mockPublicVersions);

            expect(result).toEqual({
                formattedVersion: '1.120.0',
                systemSnapshotLabel: '',
                systemLatestLabel: LATEST_VERSION
            });
        });
    });

    describe('checkSystemVersionPattern', () => {
        it('should return the version if it matches the expected pattern', () => {
            const validVersion = '1.120.0';
            expect(checkSystemVersionPattern(validVersion)).toBe(validVersion);
        });

        it('should return undefined for an invalid version', () => {
            expect(checkSystemVersionPattern('invalid-version')).toBeUndefined();
        });

        it('should return undefined when version is undefined', () => {
            expect(checkSystemVersionPattern(undefined)).toBeUndefined();
        });
    });

    describe('getInternalVersions', () => {
        it('should return filtered internal versions based on feature support', async () => {
            // Using the default, all versions are supported.
            const result = await getInternalVersions('1.120.0');
            expect(fetchInternalVersionsMock).toHaveBeenCalledWith('1.120.0');
            expect(result).toEqual(['1.120.0', '1.119.1', '1.119.0']);
        });
    });

    describe('getHigherVersions', () => {
        it('should return versions higher than the baseline version', async () => {
            const baseline = '1.119.0';

            const result = await getHigherVersions(baseline, mockPublicVersions);
            expect(result).toEqual(['1.119.1', '1.120.0 ' + LATEST_VERSION]);
        });
    });

    describe('getRelevantVersions', () => {
        it('should handle external (non-customer base) versions with a provided systemVersion', async () => {
            formatUi5VersionMock.mockReturnValue('1.119.1');
            addSnapshotMock.mockReturnValue('-snapshot');
            buildSystemVersionLabelMock.mockReturnValue('1.119.1 (system version)');

            const systemVersion = '1.119.1-snapshot';
            const result = await getRelevantVersions(systemVersion, false, mockPublicVersions);

            expect(result[0]).toBe(SNAPSHOT_VERSION);
            expect(result[1]).toBe(SNAPSHOT_UNTESTED_VERSION);
            expect(result).toContain('1.119.1 (system version)');
        });

        it('should handle customer base versions when systemVersion is provided and no snapshot label exists', async () => {
            formatUi5VersionMock.mockReturnValue('1.119.1');
            addSnapshotMock.mockReturnValue(''); // no snapshot label
            buildSystemVersionLabelMock.mockReturnValue('1.119.1 (system version)');

            const result = await getRelevantVersions('1.119.1', true, mockPublicVersions);

            expect(result).toEqual(['1.119.1 (system version)', '1.120.0 ' + LATEST_VERSION]);
        });

        it('should handle customer base versions when a snapshot label is present', async () => {
            formatUi5VersionMock.mockReturnValue('1.119.1');
            addSnapshotMock.mockReturnValue('-snapshot'); // snapshot label exists

            const result = await getRelevantVersions('1.119.1', true, mockPublicVersions);
            // When a snapshot label is present for a customer base, it returns
            // an array containing only the latest public version.
            expect(result).toEqual(['1.120.0 ' + LATEST_VERSION]);
        });

        it('should return system version and latest version when there are no higher versions and system version differs from latest', async () => {
            const olderPublicVersions = {
                latest: { version: '1.118.0' },
                '1.118.0': { version: '1.118.0' },
                '1.117.0': { version: '1.117.0' }
            } as unknown as UI5Version;

            formatUi5VersionMock.mockReturnValue('1.119.5');
            addSnapshotMock.mockReturnValue('');
            buildSystemVersionLabelMock.mockReturnValue('1.119.5 (system version)');

            const result = await getRelevantVersions('1.119.5', true, olderPublicVersions);

            expect(result).toEqual(['1.119.5 ' + CURRENT_SYSTEM_VERSION, '1.118.0 ' + LATEST_VERSION]);
        });

        it('should handle an undefined systemVersion for external users', async () => {
            const result = await getRelevantVersions(undefined, false, mockPublicVersions);

            expect(result[0]).toBe(SNAPSHOT_VERSION);
            expect(result[1]).toBe(SNAPSHOT_UNTESTED_VERSION);
        });
    });
});
