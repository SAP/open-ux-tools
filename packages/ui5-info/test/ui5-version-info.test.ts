import axios from 'axios';
import nock from 'nock';
import officialBlockOutOfMaintenanceResponse from './testdata/official-latest-block-out-of-maintenance.json';
import officialOutOfMaintenanceResponse from './testdata/official-response-latest-out-of-maintenance.json';
import officialResponse from './testdata/official-response.json';
import snapshotResponse from './testdata/snapshot-response.json';

import { ToolsLogger } from '@sap-ux/logger';
import * as commands from '../src/commands';
import * as ui5VersionConstants from '../src/constants';
import { ui5VersionRequestInfo, ui5VersionsCache } from '../src/constants';
import { getLatestUI5Version, getUI5Versions } from '../src/ui5-version-info';
import { defaultUi5Versions } from '../src/ui5-version-fallback';

const snapshotVersionsHost = 'http://ui5.versions.snapshots';

const resetUI5VersionsCache = () => {
    // reset the UI5 versions cache so each test is isolated
    (ui5VersionConstants as any).ui5VersionsCache = {
        officialVersions: [],
        snapshotsVersions: [],
        support: []
    };
};

describe('getUI5Versions', () => {
    beforeEach(() => {
        nock(ui5VersionRequestInfo.OfficialUrl)
            .persist()
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, officialResponse);
        nock(snapshotVersionsHost).persist().get(`/${ui5VersionRequestInfo.NeoAppFile}`).reply(200, snapshotResponse);
        resetUI5VersionsCache();
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    test('No filter options, all supported versions returned', async () => {
        const versions = await getUI5Versions();
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: snapshots included - snapshotVersionsHost', async () => {
        const versions = await getUI5Versions({ snapshotVersionsHost });
        expect(versions.length).toEqual(166);
        expect(versions).toMatchSnapshot();
    }, 100000);

    test('filterOptions: all available versions -  minSupportedVersion: `1.0.0`', async () => {
        const versions1 = await getUI5Versions({ minSupportedUI5Version: '1.0.0' });
        expect(versions1).toMatchSnapshot();
    });

    test('filterOptions: `onlyVersionNumbers` takes precedence, snapshots versions removed - snapshotVersionsHost, onlyVersionNumbers', async () => {
        const versions = await getUI5Versions({
            onlyVersionNumbers: true,
            snapshotVersionsHost
        });
        expect(versions.length).toEqual(145);
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: `onlyLatestPatchVersion`', async () => {
        const versions = await getUI5Versions({
            onlyLatestPatchVersion: true
        });
        expect(versions.length).toEqual(30);
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: should not be duplicates present', async () => {
        const versions = await getUI5Versions();
        const hasDups = new Set(versions.map((v) => v.version)).size !== versions.length;
        expect(hasDups).toEqual(false);
    });

    test('filterOptions: loads and use cached versions by default - useCache: true (default)', async () => {
        const axiosGetSpy = jest.spyOn(axios, 'get');
        const versions1 = await getUI5Versions();
        expect(axiosGetSpy).toHaveBeenCalled();
        expect(versions1).toMatchSnapshot();

        // Ensure default (no option) and `useCache:true` have the same behaviour
        resetUI5VersionsCache();
        const versions1WithUseCache = await getUI5Versions({ useCache: true });
        expect(axiosGetSpy).toHaveBeenCalled();
        expect(versions1WithUseCache).toEqual(versions1);

        axiosGetSpy.mockClear();
        // Should not make a network call, but return cached versions
        const versions2 = await getUI5Versions();
        expect(axiosGetSpy).not.toHaveBeenCalled();
        expect(versions1).toEqual(versions2);

        axiosGetSpy.mockClear();
        const versions3 = await getUI5Versions({
            snapshotVersionsHost
        });
        expect(axiosGetSpy).toHaveBeenCalled();
        expect(versions3).toMatchSnapshot();

        axiosGetSpy.mockClear();
        const versions4 = await getUI5Versions({
            snapshotVersionsHost
        });
        expect(axiosGetSpy).not.toHaveBeenCalled();
        expect(versions4).toEqual(versions3);

        axiosGetSpy.mockClear();
        const versions5 = await getUI5Versions({
            includeMaintained: true
        });
        // ui5VersionsType.support is already cached when ui5VersionsType.offical is called(1st test case)
        expect(versions5).toMatchSnapshot();

        axiosGetSpy.mockClear();
        const versions6 = await getUI5Versions({
            includeMaintained: true
        });
        expect(axiosGetSpy).not.toHaveBeenCalled();
        expect(versions5).toEqual(versions6);
    });

    test('filterOptions: useCache: false, retrieves latest versions (and populates the cache)', async () => {
        const axiosGetSpy = jest.spyOn(axios, 'get');
        const versions1 = await getUI5Versions({ useCache: false });
        expect(axiosGetSpy).toHaveBeenCalled();
        expect(versions1).toMatchSnapshot();

        axiosGetSpy.mockClear();
        // Should not make a network call, but return cached versions
        const versions2 = await getUI5Versions({ useCache: false });
        expect(axiosGetSpy).toHaveBeenCalled();
        expect(versions1).toEqual(versions2);
    });

    test('filterOptions: mark default versions - `includeDefault`', async () => {
        const versions = await getUI5Versions({ includeDefault: true });
        expect(versions.length).toEqual(145);
        const defaultVersion = versions.find((ver) => ver.default === true);
        expect(defaultVersion).toBeDefined();
    });

    test('filterOptions: returns support info - includeMaintained', async () => {
        const versions = await getUI5Versions({ includeMaintained: true });
        let supportedCount = 0,
            notSupportedCount = 0;
        versions.forEach((version) => (version.maintained ? supportedCount++ : notSupportedCount++));
        expect(supportedCount).toEqual(91);
        expect(notSupportedCount).toEqual(54);
        expect(versions).toMatchSnapshot();
    }, 1000000);

    test('filterOptions: includeDefault and includeMaintained combined look for next maintained version if latest one is Out of maintenance', async () => {
        nock.cleanAll();
        nock(ui5VersionRequestInfo.OfficialUrl)
            .persist()
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, officialOutOfMaintenanceResponse);

        const versions = await getUI5Versions({
            includeDefault: true,
            includeMaintained: true
        });
        // Returns next maintained version if latest is `Out of maintenance`
        expect(versions[1].version).toEqual('1.125.1');
        expect(versions[1].default).toEqual(true);
    });
    test('filterOptions: includeDefault and includeMaintained combined look for next maintained version when `latest` block from official is out of maintenance', async () => {
        nock.cleanAll();
        nock(ui5VersionRequestInfo.OfficialUrl)
            .persist()
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, officialBlockOutOfMaintenanceResponse);

        const versions = await getUI5Versions({
            includeDefault: true,
            includeMaintained: true
        });
        // Returns next maintained version if latest string in official is `Out of maintenance`
        expect(versions[2].version).toEqual('1.124.2');
        expect(versions[2].default).toEqual(true);
    });
});

describe('getUI5Versions: Handle error cases while getting UI5 versions: ', () => {
    const logWarnSpy = jest.spyOn(ToolsLogger.prototype, 'warn');
    const logErrorSpy = jest.spyOn(ToolsLogger.prototype, 'error');

    beforeEach(() => {
        nock(ui5VersionRequestInfo.OfficialUrl).get(`/${ui5VersionRequestInfo.VersionsFile}`).reply(500, '');
        resetUI5VersionsCache();
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    test('UI5 versions fallback if official is not available ', async () => {
        const versions = await getUI5Versions();
        expect(versions).toMatchSnapshot();
        expect(logWarnSpy).toHaveBeenCalledTimes(1);
    });

    test('UI5 versions fallback if snapshot is not available ', async () => {
        const versions = await getUI5Versions({ snapshotVersionsHost });
        expect(versions).toMatchSnapshot();
        expect(logErrorSpy).toHaveBeenCalledTimes(1);
        expect(logWarnSpy).toHaveBeenCalledTimes(1);
    });

    test('UI5 versions fallback for specified min UI5 version, if request fails', async () => {
        const versions = await getUI5Versions({ minSupportedUI5Version: '1.71.0' });
        expect(versions).toMatchSnapshot();
        expect(logWarnSpy).toHaveBeenCalledTimes(1);
    });

    test('UI5 versions fallback for maintained versions, if request fails', async () => {
        const versions = await getUI5Versions({ includeMaintained: true });
        expect(versions).toMatchSnapshot();
        expect(logWarnSpy).toHaveBeenCalledTimes(2);
    });
});

describe('getUI5Versions: Handle fatal cases while getting UI5 versions: ', () => {
    const logWarnSpy = jest.spyOn(ToolsLogger.prototype, 'warn');
    const logErrorSpy = jest.spyOn(ToolsLogger.prototype, 'error');

    beforeEach(() => {
        nock(ui5VersionRequestInfo.OfficialUrl)
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .replyWithError('Fatal error');
        resetUI5VersionsCache();
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    test('UI5 versions fallback if official is not available ', async () => {
        const versions = await getUI5Versions();
        expect(versions).toMatchSnapshot();
        expect(logWarnSpy).toHaveBeenCalledTimes(1);
    });

    test('UI5 versions fallback if snapshot is not available ', async () => {
        const versions = await getUI5Versions({ snapshotVersionsHost });
        expect(versions).toMatchSnapshot();
        expect(logErrorSpy).toHaveBeenCalledTimes(1);
        expect(logWarnSpy).toHaveBeenCalledTimes(1);
    });
});

describe('getUI5Versions: npm listed versions', () => {
    const ui5VersionsStr176 = ['1.76.0', '1.77.0', '1.78.1', '1.79.1', '1.80-snapshot'];
    const ui5VersionsStr179 = ['1.85.0', '1.84.1', '1.82.2', '1.82.1', '1.81.1', '1.81.0', '1.79.0'];

    beforeEach(() => {
        jest.resetModules();
        resetUI5VersionsCache();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Validate UI5 version lists is sorted', async () => {
        const commandRunSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(ui5VersionsStr176);

        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.79.1' }); // Sorted
        expect(retrievedUI5Versions.length).toEqual(4);
    });

    it('Validate UI5 version lists is sorted with snapshot versions', async () => {
        const commandRunSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(ui5VersionsStr176);
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.79.1' }); // Sorted
        expect(retrievedUI5Versions.length).toEqual(4);
    });

    it('Return a UI5 version if a non supported version is selected', async () => {
        const commandRunSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(ui5VersionsStr176);
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '1.80.0' }); // Not supported
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.79.1' }); // Only return supported version from NPM
        expect(retrievedUI5Versions.length).toEqual(4); // Will remove one since its not part of the min supported versions
    });

    it('Validate UI5 NPM versions are returned when a min UI5 version is specified', async () => {
        const commandRunSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(ui5VersionsStr179);

        let retrievedUI5Versions = await getUI5Versions({
            onlyNpmVersion: true,
            minSupportedUI5Version: '1.84.0'
        });
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.85.0' });
        expect(retrievedUI5Versions.length).toEqual(2);

        // Selected version specified
        retrievedUI5Versions = await getUI5Versions({
            onlyNpmVersion: true,
            ui5SelectedVersion: '1.84.1', // Supported
            minSupportedUI5Version: '1.84.0'
        });
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.84.1' });
        expect(retrievedUI5Versions.length).toEqual(1);
        expect(commandRunSpy).toHaveBeenCalledTimes(2);
    });

    it('Validate UI5 version returns a supported version for a non supported selected version', async () => {
        const commandRunSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(ui5VersionsStr176);
        let versions = await getUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '1.74.0' }); // Not supported
        expect(versions[0]).toEqual({ version: '1.76.0' });
        versions = await getUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '1.74-supported' }); // Not supported
        expect(versions[0]).toEqual({ version: '1.79.1' });
        expect(versions.length).toEqual(4);
        versions = await getUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: 'non-supported' }); // Not supported
        expect(versions[0]).toEqual({ version: '1.79.1' });
        expect(versions.length).toEqual(4);
        versions = await getUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: 'Latest' });
        expect(versions[0]).toEqual({ version: '1.79.1' });
        expect(versions.length).toEqual(4);
        versions = await getUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '' });
        expect(versions[0]).toEqual({ version: '1.79.1' });
        expect(versions.length).toEqual(4);
        expect(commandRunSpy).toHaveBeenCalledTimes(5);
    });

    it('Return a UI5 version if no npm versions are found - part 1', async () => {
        const commandRunSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue([]);
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.65.0' }); // Return min version since NPM returns an empty string
        expect(retrievedUI5Versions.length).toEqual(1); // Will remove one since its not part of the min supported versions
    });

    it('Return a UI5 version if no npm versions are found - part 2', async () => {
        const commandRunSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue([]);
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true, minSupportedUI5Version: '1.76.0' });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.76.0' }); // Return min version since NPM returns an empty string
        expect(retrievedUI5Versions.length).toEqual(1); // Will remove one since its not part of the min supported versions
    });

    it('Never return duplicate versions', async () => {
        const ui5DuplicateVer = ['1.90.1', '1.90.1'];
        const commandRunSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(ui5DuplicateVer);
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.90.1' });
        expect(retrievedUI5Versions.length).toEqual(1);
    });
});

describe('getLatestUI5Version', () => {
    /**
     * Mocks ui5VersionsCache.officialVersions.
     *
     * @param {string[]} [officialVersions] - Versions to populate the cache. Defaults to an empty array if not provided.
     */
    const mockUi5VersionsCache = (officialVersions?: string[]) => {
        ui5VersionsCache.officialVersions = officialVersions || [];
    };

    beforeAll(() => {
        // Mock the ui5VersionsCache
        const originalConstants = jest.requireActual('../src/constants');
        return {
            ...originalConstants,
            ui5VersionsCache: {
                officialVersions: [],
                snapshotsVersions: [],
                support: []
            }
        };
    });

    beforeEach(() => {
        jest.resetModules();
        resetUI5VersionsCache();
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    it('Return latest UI5 version', async () => {
        nock(ui5VersionRequestInfo.OfficialUrl)
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, officialResponse);

        const latestVersion = await getLatestUI5Version();
        expect(latestVersion).toBe('1.109.3');
    });

    it('Return undefined as UI5 version JSON is null', async () => {
        nock(ui5VersionRequestInfo.OfficialUrl)
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, null as unknown as string);
        const latestVersion = await getLatestUI5Version(false);
        expect(latestVersion).toBe(defaultUi5Versions[0]); // Default version should be returned
    });

    it('Return undefined as latest UI5 version is not returned', async () => {
        nock(ui5VersionRequestInfo.OfficialUrl)
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, { latest: {} });

        const latestVersion = await getLatestUI5Version(false);
        expect(latestVersion).toBe(undefined);
    });

    it('Return undefined as network call throws exception', async () => {
        jest.spyOn(axios, 'get').mockImplementationOnce(() => {
            throw new Error('Network error');
        });
        const latestVersion = await getLatestUI5Version(false);
        expect(latestVersion).toBe(defaultUi5Versions[0]); // Default version should be returned
    });

    it('Fetch from API when useCache is false and cache is empty', async () => {
        mockUi5VersionsCache([]);
        const apiRequestMock = nock(ui5VersionRequestInfo.OfficialUrl)
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, officialResponse);

        const latestVersion = await getLatestUI5Version(false);
        expect(latestVersion).toBe(officialResponse.latest.version);
        expect(apiRequestMock.isDone()).toBe(true);
    });

    it('Return undefined when cache is empty and API returns no versions', async () => {
        mockUi5VersionsCache([]);
        const apiRequestMock = nock(ui5VersionRequestInfo.OfficialUrl)
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, { latest: {} });

        const latestVersion = await getLatestUI5Version(false);
        expect(apiRequestMock.isDone()).toBe(true);
        expect(latestVersion).toBe(undefined);
    });

    it('Return version from ui5VersionsCache when useCache is true', async () => {
        mockUi5VersionsCache(['1.109.3', '1.108.0', '1.107.0']);
        const apiRequestMock = nock(ui5VersionRequestInfo.OfficialUrl)
            .get(`/${ui5VersionRequestInfo.VersionsFile}`)
            .reply(200, { latest: {} });

        const latestVersion = await getLatestUI5Version(true);
        expect(apiRequestMock.isDone()).toBe(false); // No API call made
        expect(latestVersion).toBe('1.109.3');
    });
});
