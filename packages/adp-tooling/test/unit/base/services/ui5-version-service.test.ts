import {
    SNAPSHOT_CDN_URL,
    UI5_CDN_URL,
    getOfficialBaseUI5VersionUrl,
    getFormattedVersion,
    removeBracketsFromVersion,
    removeMicroPart,
    removeTimestampFromVersion,
    addSnapshot,
    getTrimmedUI5Version,
    parseUI5Version,
    isFeatureSupportedVersion,
    FlexLayer,
    UI5VersionService,
    UI5_VERSIONS_CDN_URL
} from '../../../../src';
import { t } from '../../../../src/i18n';
import { fetchMock } from '../../../__mock__/global';

describe('UI5 Version Service', () => {
    describe('getOfficialBaseUI5VersionUrl', () => {
        it('returns the snapshot CDN URL for snapshot versions', () => {
            expect(getOfficialBaseUI5VersionUrl('1.82.2-snapshot')).toBe(SNAPSHOT_CDN_URL);
        });

        it('returns the main CDN URL for regular versions', () => {
            expect(getOfficialBaseUI5VersionUrl('1.82.2')).toBe(UI5_CDN_URL);
        });
    });

    describe('getFormattedVersion', () => {
        it('formats snapshot versions correctly', () => {
            expect(getFormattedVersion('1.96.0-snapshot')).toBe('snapshot-1.96');
        });

        it('returns the same version if not a snapshot', () => {
            expect(getFormattedVersion('1.82.2')).toBe('1.82.2');
        });
    });

    describe('removeBracketsFromVersion', () => {
        it('removes parenthetical information from version strings', () => {
            expect(removeBracketsFromVersion('1.82.2 (latest)')).toBe('1.82.2');
        });

        it('returns unchanged version if no brackets present', () => {
            expect(removeBracketsFromVersion('1.82.2')).toBe('1.82.2');
        });
    });

    describe('removeMicroPart', () => {
        it('removes the micro part of the version', () => {
            expect(removeMicroPart('1.82.2')).toBe('1.82');
        });
    });

    describe('removeTimestampFromVersion', () => {
        it('removes the timestamp from version strings', () => {
            expect(removeTimestampFromVersion('1.82.2.34566363464')).toBe('1.82.2');
        });
    });

    describe('addSnapshot', () => {
        it('appends -snapshot if conditions are met', () => {
            expect(addSnapshot('1.82.2.34566363464', '1.82.1')).toBe('-snapshot');
        });

        it('returns an empty string if conditions are not met', () => {
            expect(addSnapshot('1.82.2', '1.82.2')).toBe('');
        });
    });

    describe('getTrimmedUI5Version', () => {
        it('extracts the version from strings containing additional text', () => {
            expect(getTrimmedUI5Version('UI5 version 1.84.6 (system version)')).toBe('1.84.6');
        });

        it('returns the original version string if no additional text present', () => {
            expect(getTrimmedUI5Version('1.99.2')).toBe('1.99.2');
        });
    });

    describe('parseUI5Version', () => {
        it('parses major, minor, and patch from a version string', () => {
            expect(parseUI5Version('1.86.11')).toEqual({ major: 1, minor: 86, patch: 11 });
        });

        it('returns 1.86.11 for each part if the version contains snapshot', () => {
            expect(parseUI5Version('snapshot-1.86.11')).toEqual({ major: 1, minor: 86, patch: 11 });
        });
    });

    describe('isFeatureSupportedVersion', () => {
        it('returns true if the current version supports the feature', () => {
            expect(isFeatureSupportedVersion('1.84.0', '1.85.0')).toBe(true);
        });

        it('returns true if the current version supports the feature', () => {
            expect(isFeatureSupportedVersion('1.84.0', '1.84.1')).toBe(true);
        });

        it('returns true if the current version supports the feature', () => {
            expect(isFeatureSupportedVersion('1.84.0', '2.15.0')).toBe(true);
        });

        it('returns true if the current version supports the feature', () => {
            expect(isFeatureSupportedVersion('1.84.0', '2.89.1')).toBe(true);
        });

        it('returns false if the current version does not support the feature', () => {
            expect(isFeatureSupportedVersion('1.86.0', '1.85.0')).toBe(false);
        });

        it('returns false if no version is provided', () => {
            expect(isFeatureSupportedVersion('1.86.0')).toBe(false);
        });
    });

    describe('UI5VersionService', () => {
        const publicVersions = {
            'latest': {
                version: '1.127.0',
                support: 'Maintenance',
                lts: false
            },
            '1.127': {
                version: '1.127.0',
                support: 'Maintenance',
                lts: false
            },
            '1.124': {
                version: '1.124.5',
                support: 'Maintenance',
                lts: false
            }
        };

        const mockRoutes = {
            routes: [
                { target: { version: '1.127.0' } },
                { target: { version: '1.125.1' } },
                { target: { version: '1.124.5' } }
            ]
        };

        fetchMock.mockResolvedValue({
            json: () => Promise.resolve(publicVersions)
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        describe('getSystemRelevantVersions', () => {
            let service: UI5VersionService;
            let versionsSpy: jest.SpyInstance;

            beforeEach(() => {
                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
                versionsSpy = jest.spyOn(service, 'getRelevantVersions').mockResolvedValue(['1.127.0 (latest)']);
            });

            it('should return latest version when provided version matches pattern', async () => {
                const versions = await service.getSystemRelevantVersions('1.124.0.53435768432');

                expect(versions).toContain('1.127.0 (latest)');
                expect(service.detectedVersion).toBeTruthy();
                expect(versionsSpy).toHaveBeenCalledWith('1.124.0.53435768432');
            });

            it('should return latest version if provided version does not match pattern', async () => {
                const versions = await service.getSystemRelevantVersions('v1.80');

                expect(versions).toEqual(['1.127.0 (latest)']);
                expect(service.detectedVersion).toBeFalsy();
                expect(versionsSpy).toHaveBeenCalledWith(undefined);
            });
        });

        describe('getVersionToBeUsed', () => {
            let service: UI5VersionService;

            beforeEach(() => {
                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
            });

            it('returns the latest version for snapshot in customer base', () => {
                service.latestVersion = '1.127.0';
                expect(service.getVersionToBeUsed('1.124.2-snapshot', true)).toBe('1.127.0');
            });

            it('returns the provided version when not a snapshot', () => {
                expect(service.getVersionToBeUsed('1.124.0', false)).toBe('1.124.0');
            });
        });

        describe('getPublicVersions', () => {
            let service: UI5VersionService;

            beforeEach(() => {
                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
            });

            it('fetches public versions if not cached', async () => {
                const versions = await service.getPublicVersions();

                expect(versions).toEqual(publicVersions);
                expect(fetchMock).toHaveBeenCalledWith(UI5_VERSIONS_CDN_URL);
            });

            it('returns cached public versions if already fetched', async () => {
                const versions = await service.getPublicVersions();

                expect(versions).toEqual(publicVersions);
            });
        });

        describe('shouldSetMinUI5Version', () => {
            let service: UI5VersionService;

            beforeEach(() => {
                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
            });

            it('returns false if no detected version', () => {
                service.detectedVersion = false;
                expect(service.shouldSetMinUI5Version()).toBeFalsy();
            });

            it('returns true if detected version and minor version >= 90', () => {
                service.systemVersion = '1.90.0';
                service.detectedVersion = true;
                expect(service.shouldSetMinUI5Version()).toBeTruthy();
            });
        });

        describe('getMinUI5VersionForManifest', () => {
            let service: UI5VersionService;

            beforeEach(() => {
                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
            });

            it('returns system version if no snapshot', () => {
                service.systemVersion = '1.124.0';
                expect(service.getMinUI5VersionForManifest()).toBe('1.124.0');
            });

            it('returns latest version if system version is snapshot', () => {
                service.latestVersion = '1.127.0';
                service.systemVersion = '1.124.0 snapshot';
                expect(service.getMinUI5VersionForManifest()).toBe('1.127.0');
            });
        });

        describe('getRelevantVersions', () => {
            let service: UI5VersionService;

            beforeEach(() => {
                fetchMock.mockResolvedValue({
                    json: () => Promise.resolve(publicVersions)
                });
            });

            afterEach(() => {
                jest.restoreAllMocks();
                fetchMock.mockRestore();
            });

            it('should return latest version when provided version is "1.124.0.53435768432" (CUSTOMER_BASE layer)', async () => {
                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
                const versions = await service.getRelevantVersions('1.124.0.53435768432');

                expect(versions).toContain('1.127.0 (latest)');
            });

            it('should return latest version if provided version is "undefined" (CUSTOMER_BASE layer)', async () => {
                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
                const versions = await service.getRelevantVersions(undefined);

                expect(versions).toEqual(['1.127.0 (latest)']);
            });

            it('should return latest system version if provided version is "1.127.0.53435768432" (VENDOR layer)', async () => {
                fetchMock
                    .mockResolvedValueOnce({
                        json: () => Promise.resolve(publicVersions)
                    })
                    .mockResolvedValueOnce({
                        json: () => Promise.resolve(mockRoutes)
                    });

                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
                const versions = await service.getRelevantVersions('1.127.0.53435768432');

                expect(versions).toEqual(['1.127.0 (system version)(latest)']);
            });

            it('should return array of versions if provided version is "1.124.0.53435768432" (VENDOR layer)', async () => {
                fetchMock
                    .mockResolvedValueOnce({
                        json: () => Promise.resolve(publicVersions)
                    })
                    .mockResolvedValueOnce({
                        json: () => Promise.resolve(mockRoutes)
                    });

                service = new UI5VersionService(FlexLayer.VENDOR);
                const versions = await service.getRelevantVersions('1.124.0.53435768432');

                expect(versions).toEqual([
                    'snapshot-untested',
                    'snapshot',
                    '1.124.0-snapshot (system version)',
                    '1.127.0 (latest)',
                    '1.125.1',
                    '1.124.5'
                ]);
            });

            it('should return latest version if provided version is undefined (VENDOR layer)', async () => {
                fetchMock
                    .mockResolvedValueOnce({
                        json: () => Promise.resolve(publicVersions)
                    })
                    .mockResolvedValueOnce({
                        json: () => Promise.resolve(mockRoutes)
                    });

                service = new UI5VersionService(FlexLayer.VENDOR);
                const versions = await service.getRelevantVersions(undefined);

                expect(versions).toEqual(['snapshot-untested', 'snapshot', '1.127.0 (latest)', '1.125.1', '1.124.5']);
            });
        });

        describe('validateUI5Version', () => {
            let service: UI5VersionService;

            beforeEach(() => {
                fetchMock.mockClear();
                service = new UI5VersionService(FlexLayer.CUSTOMER_BASE);
            });

            it('validates a regular version successfully', async () => {
                const version = '1.80.2';
                fetchMock.mockResolvedValueOnce({ ok: true });

                const result = await service.validateUI5Version(version);

                expect(result).toBe(true);
                expect(fetch).toHaveBeenCalledWith(
                    `${getOfficialBaseUI5VersionUrl(version)}/${getFormattedVersion(version)}`
                );
            });

            it('returns an error message for a snapshot version that cannot be reached', async () => {
                const version = '1.84.6-snapshot';
                fetchMock.mockRejectedValueOnce({ response: { status: 404 } });

                const result = await service.validateUI5Version(version);
                const expectedErrorMessage = t('validators.ui5VersionNotReachableError').replace(
                    '<URL>',
                    getOfficialBaseUI5VersionUrl(version)
                );

                expect(result).toBe(expectedErrorMessage);
                expect(fetch).toHaveBeenCalledWith(`${getOfficialBaseUI5VersionUrl(version)}/neo-app.json`);
            });

            it('returns an error message for an outdated version', async () => {
                const version = '1.75.0';
                fetchMock.mockRejectedValueOnce({ response: { status: 404 } });

                const result = await service.validateUI5Version(version);

                expect(result).toBe(t('validators.ui5VersionOutdatedError'));
                expect(fetch).toHaveBeenCalledWith(
                    `${getOfficialBaseUI5VersionUrl(version)}/${getFormattedVersion(version)}`
                );
            });

            it('returns a generic error message on fetch error with other statuses', async () => {
                const version = '1.85.0';
                const error = 'Network issue';
                fetchMock.mockRejectedValueOnce({ response: { status: 500 }, message: 'Network issue' });

                const result = await service.validateUI5Version(version);

                expect(result).toBe(`Error on validating UI5 Version: ${error}`);
                expect(fetch).toHaveBeenCalledWith(
                    `${getOfficialBaseUI5VersionUrl(version)}/${getFormattedVersion(version)}`
                );
            });

            it('returns a message when version is not provided', async () => {
                const result = await service.validateUI5Version();

                expect(result).toBe(t('validators.ui5VersionCannotBeEmpty'));
                expect(fetch).not.toHaveBeenCalled();
            });
        });
    });
});
