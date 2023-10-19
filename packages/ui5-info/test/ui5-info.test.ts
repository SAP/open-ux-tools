import nock from 'nock';
import axios from 'axios';
// import snapshotResponse from './testdata/snapshot-response.json';
import officialResponse from './testdata/official-response.json';
import overviewResponse from './testdata/overview-response.json';

import { UI5_VERSIONS_TYPE, ui5VersionsCache } from '../src/ui5-info';
import { CommandRunner } from '../src/commandRunner';
import { UI5Info, type UI5VersionOverview } from '../src/types';

// Require for axios to work with nock
axios.defaults.adapter = require('axios/lib/adapters/http');

describe('retrieveUI5Versions: ', () => {
    beforeEach(() => {
        nock(UI5Info.OfficialUrl).get(`/${UI5Info.VersionsFile}`).twice().reply(200, officialResponse);
        nock(UI5Info.OfficialUrl).persist().get(`/${UI5Info.VersionsOverview}`).twice().reply(200, overviewResponse);
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    test('Official UI5 versions', async () => {
        const versions = await retrieveUI5Versions();
        expect(versions).toMatchSnapshot();
    });

    test('Official + snapshot UI5 versions', async () => {
        const versions = await retrieveUI5Versions({ includeSnapshots: true });
        expect(versions).toMatchSnapshot();
    });

    test('Official UI versions for v2', async () => {
        const versions = await retrieveUI5Versions({ fioriElementsVersion: FioriElementsVersion.v2 });
        expect(versions).toMatchSnapshot();
    });

    test('Official UI versions for v4', async () => {
        const versions = await retrieveUI5Versions({ fioriElementsVersion: FioriElementsVersion.v4 });
        expect(versions).toMatchSnapshot();
    });

    test('Official + snapshot UI versions for v2', async () => {
        const versions = await retrieveUI5Versions({
            fioriElementsVersion: FioriElementsVersion.v2,
            includeSnapshots: true
        });
        expect(versions).toMatchSnapshot();
    });

    test('Official + snapshot UI versions for v4', async () => {
        const versions = await retrieveUI5Versions({
            fioriElementsVersion: FioriElementsVersion.v4,
            includeSnapshots: true
        });
        expect(versions).toMatchSnapshot();
    });

    test('Official, exclude latest', async () => {
        const versions = await retrieveUI5Versions({
            onlyVersionNumbers: true
        });
        expect(versions).toMatchSnapshot();
    });

    test('Official + snapshot, exclude latest and snapshots', async () => {
        const versions = await retrieveUI5Versions({
            includeSnapshots: true,
            onlyVersionNumbers: true
        });
        expect(versions).toMatchSnapshot();
    });

    test('Latest UI5 with version number', async () => {
        const versions = await retrieveUI5Versions({ removeDuplicateVersions: true }, undefined, true);
        expect(versions).toMatchSnapshot();
    });

    test('Retrieve versions from cache', async () => {
        expect(ui5VersionsCache.snapshotsVersions.length === 0).toBe(true);
        expect(ui5VersionsCache.officialVersions.length === 0).toBe(true);

        let versions = (await retrieveUI5VersionsCache(UI5_VERSIONS_TYPE.snapshot, true)) as string[];
        expect(ui5VersionsCache.snapshotsVersions.length > 0).toBe(true);
        expect(ui5VersionsCache.officialVersions.length === 0).toBe(true);
        expect(ui5VersionsCache.overview.length === 0).toBe(true);
        expect(versions.some((v) => v.includes('snapshot'))).toBe(true);

        versions = (await retrieveUI5VersionsCache(UI5_VERSIONS_TYPE.official, true)) as string[];
        expect(ui5VersionsCache.snapshotsVersions.length > 0).toBe(true);
        expect(ui5VersionsCache.officialVersions.length > 0).toBe(true);
        expect(ui5VersionsCache.overview.length === 0).toBe(true);
        expect(versions.some((v) => v.includes('snapshot'))).toBe(false);

        let versionsOverview = (await retrieveUI5VersionsCache(
            UI5_VERSIONS_TYPE.overview,
            false
        )) as UI5VersionOverview[];
        expect(ui5VersionsCache.overview.length === 0).toBe(true);
        expect(versionsOverview.length > 0).toBe(true);

        versionsOverview = (await retrieveUI5VersionsCache(UI5_VERSIONS_TYPE.overview, true)) as UI5VersionOverview[];
        expect(ui5VersionsCache.overview.length > 0).toBe(true);
    });

    test('Retrieve enhanced versions for project generator', async () => {
        let versions = await getUI5VersionsEnhanced({});
        expect(versions.length > 0).toBe(true);
        expect(versions.find((ver) => ver.version.default === true)).toBeDefined();

        versions = await getUI5VersionsEnhanced({ groupUI5Versions: true });
        expect(versions.length > 0).toBe(true);
        expect(versions.every((ver) => ver.version.maintained)).toBeDefined();
    });
});

describe('Handle error cases while getting UI5 versions: ', () => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    beforeEach(() => {
        nock(UI5Info.OfficialUrl).get(`/${UI5Info.VersionsFile}`).reply(500, '');
    });

    afterEach(() => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        jest.clearAllMocks();
        nock.cleanAll();
    });

    test('UI5 versions fallback if official is not available ', async () => {
        console.warn = jest.fn();
        const versions = await retrieveUI5Versions();
        expect(versions).toMatchSnapshot();
        expect(console.warn).toBeCalledTimes(1);
    });

    test('UI5 versions fallback if snapshot is not available ', async () => {
        console.error = jest.fn();
        console.warn = jest.fn();
        const versions = await retrieveUI5Versions({ includeSnapshots: true });
        expect(versions).toMatchSnapshot();
        expect(console.error).toBeCalledTimes(1);
        expect(console.warn).toBeCalledTimes(1);
    });

    test('UI5 versions fallback for v2 if official is not available ', async () => {
        console.warn = jest.fn();
        const versions = await retrieveUI5Versions({ fioriElementsVersion: FioriElementsVersion.v2 });
        expect(versions).toMatchSnapshot();
        expect(console.warn).toBeCalledTimes(1);
    });

    test('UI5 versions fallback for v4 if official is not available ', async () => {
        console.warn = jest.fn();
        const versions = await retrieveUI5Versions({ fioriElementsVersion: FioriElementsVersion.v4 });
        expect(versions).toMatchSnapshot();
        expect(console.warn).toBeCalledTimes(1);
    });
});

describe('Handle fatal cases while getting UI5 versions: ', () => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    beforeEach(() => {
        nock(UI5Info.OfficialUrl).get(`/${UI5Info.VersionsFile}`).replyWithError('Fatal error');
    });

    afterEach(() => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        jest.clearAllMocks();
        nock.cleanAll();
    });

    test('UI5 versions fallback if official is not available ', async () => {
        console.warn = jest.fn();
        const versions = await retrieveUI5Versions();
        expect(versions).toMatchSnapshot();
        expect(console.warn).toBeCalledTimes(1);
    });

    test('UI5 versions fallback if snapshot is not available ', async () => {
        console.error = jest.fn();
        console.warn = jest.fn();
        const versions = await retrieveUI5Versions({ includeSnapshots: true });
        expect(versions).toMatchSnapshot();
        expect(console.error).toBeCalledTimes(1);
        expect(console.warn).toBeCalledTimes(1);
    });
});

describe('Retrieve NPM UI5 Versions tests', () => {
    const ui5V2VersionsStr = `['1.76.0', '1.77.0', '1.78.1', '1.79.1', '1.80-snapshot']`; // Un-ordered
    const ui5V2MixVersionsStr = `['1.76.0', '1.77.0', '1.78.1', '1.79.1', '1.80-snapshot']`;
    const ui5V2EmptyStr = `[]`;
    const ui5V4VersionsStr = `['1.85.0', '1.84.1', '1.82.2', '1.82.1', '1.81.1', '1.81.0', '1.79.0']`;

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Validate UI5 version lists is sorted', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2VersionsStr)));
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual('1.79.1'); // Sorted
        expect(retrievedUI5Versions.length).toEqual(4);
    });

    it('Validate UI5 version lists is sorted with snapshot versions', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2MixVersionsStr)));
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual('1.79.1'); // Sorted
        expect(retrievedUI5Versions.length).toEqual(4);
    });

    it('Return a UI5 version if a non supported version is selected', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2VersionsStr)));
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '1.80.0' }); // Not supported
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual('1.79.1'); // Only return supported version from NPM
        expect(retrievedUI5Versions.length).toEqual(4); // Will remove one since its not part of the min supported versions
    });

    it('Validate UI5 NPM versions are handled for v4', async () => {
        // Return default min version
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V4VersionsStr)));
        let retrievedUI5Versions = await retrieveUI5Versions({
            onlyNpmVersion: true,
            fioriElementsVersion: FioriElementsVersion.v4
        });
        expect(retrievedUI5Versions[0]).toEqual('1.85.0');
        expect(retrievedUI5Versions.length).toEqual(2); // Only return supported min version and up!

        // Part 2 - handle a selected v4 version
        retrievedUI5Versions = await retrieveUI5Versions({
            onlyNpmVersion: true,
            ui5SelectedVersion: '1.84.1', // Supported
            fioriElementsVersion: FioriElementsVersion.v4
        });
        expect(retrievedUI5Versions[0]).toEqual('1.84.1'); // Is a supported version so return it
        expect(retrievedUI5Versions.length).toEqual(1);
        expect(commandRunSpy).toHaveBeenCalledTimes(2);
    });

    it('Validate UI5 version returns a supported version for a non supported selected version', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2VersionsStr)));
        let versions = await retrieveUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '1.74.0' }); // Not supported
        expect(versions[0]).toEqual('1.76.0');
        versions = await retrieveUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '1.74-supported' }); // Not supported
        expect(versions[0]).toEqual('1.79.1');
        expect(versions.length).toEqual(4);
        versions = await retrieveUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: 'non-supported' }); // Not supported
        expect(versions[0]).toEqual('1.79.1');
        expect(versions.length).toEqual(4);
        versions = await retrieveUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: 'Latest' });
        expect(versions[0]).toEqual('1.79.1');
        expect(versions.length).toEqual(4);
        versions = await retrieveUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '' });
        expect(versions[0]).toEqual('1.79.1');
        expect(versions.length).toEqual(4);
        expect(commandRunSpy).toHaveBeenCalledTimes(5);
    });

    it('Return a UI5 version if no npm versions are found - part 1', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2EmptyStr)));
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual('1.76.0'); // Return min version since NPM returns an empty string
        expect(retrievedUI5Versions.length).toEqual(1); // Will remove one since its not part of the min supported versions
    });

    it('Return a UI5 version if no npm versions are found - part 2', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest.fn().mockResolvedValue(Promise.resolve('')));
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual('1.76.0'); // Return min version since NPM returns an empty string
        expect(retrievedUI5Versions.length).toEqual(1); // Will remove one since its not part of the min supported versions
    });

    it('Return a UI5 version with duplicate npm version', async () => {
        const ui5DuplicateVer = `['1.90.1', '1.90.1']`;
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5DuplicateVer)));
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual('1.90.1');
        expect(retrievedUI5Versions.length).toEqual(2);
    });
});
