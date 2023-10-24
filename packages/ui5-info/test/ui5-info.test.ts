import nock from 'nock';
import axios from 'axios';
import snapshotResponse from './testdata/snapshot-response.json';
import officialResponse from './testdata/official-response.json';
import overviewResponse from './testdata/overview-response.json';

import { getUI5Versions } from '../src/ui5-info';
import { CommandRunner } from '../src/commandRunner';
import { FioriElementsVersion, UI5Info } from '../src/types';
import { ToolsLogger } from '@sap-ux/logger';

const snapshotVersionsHost = 'http://ui5.versions.snapshots';
// Require for axios to work with nock
axios.defaults.adapter = require('axios/lib/adapters/http');

describe('getUI5Versions', () => {
    beforeEach(() => {
        nock(UI5Info.OfficialUrl).get(`/${UI5Info.VersionsFile}`).reply(200, officialResponse);
        nock(snapshotVersionsHost).get(`/${UI5Info.NeoAppFile}`).reply(200, snapshotResponse);
        nock(UI5Info.OfficialUrl).persist().get(`/${UI5Info.VersionsOverview}`).reply(200, overviewResponse);
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
        expect(versions.length).toEqual(165);
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: FE v2 supported versions - `FioriElementsVersion.v2`', async () => {
        const versions = await getUI5Versions({ fioriElementsVersion: FioriElementsVersion.v2 });
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: FE v2 supported versions, inc.snapshpts - `FioriElementsVersion.v2`, snapshotVersionsHost', async () => {
        const versions = await getUI5Versions({
            fioriElementsVersion: FioriElementsVersion.v2,
            snapshotVersionsHost
        });
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: FE v4 supported versions - `FioriElementsVersion.v4`', async () => {
        const versions = await getUI5Versions({ fioriElementsVersion: FioriElementsVersion.v4 });
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: FE v4 supported versions, inc. snapshot - `FioriElementsVersion.v4`, snapshotVersionsHost', async () => {
        const versions = await getUI5Versions({
            fioriElementsVersion: FioriElementsVersion.v4,
            snapshotVersionsHost
        });
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: all available versions -  minSupportedVersion: `1.0.0`', async () => {
        const versions = await getUI5Versions({ minSupportedUI5Version: '1.0.0' });
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: `onlyVersionNumbers` takes precedence, snapshots versions removed - snapshotVersionsHost, onlyVersionNumbers', async () => {
        const versions = await getUI5Versions({
            onlyVersionNumbers: true,
            snapshotVersionsHost
        });
        expect(versions.length).toEqual(145);
        expect(versions).toMatchSnapshot();
    });

    test('filterOptions: remove dups - removeDuplicateVersions', async () => {
        const versions = await getUI5Versions({ removeDuplicateVersions: true });
        const hasDups = new Set(versions.map((v) => v.version)).size !== versions.length;
        expect(hasDups).toEqual(false);
    });

    test('filterOptions: loads and use cached versions - useCache: true', async () => {
        const axiosGetSpy = jest.spyOn(axios, 'get');
        const versions1 = await getUI5Versions({
            useCache: true
        });
        expect(axiosGetSpy).toHaveBeenCalled();
        expect(versions1).toMatchSnapshot();

        axiosGetSpy.mockClear();
        const versions2 = await getUI5Versions({
            useCache: true
        });
        expect(axiosGetSpy).not.toHaveBeenCalled();
        expect(versions1).toEqual(versions2);

        axiosGetSpy.mockClear();
        const versions3 = await getUI5Versions({
            useCache: true,
            snapshotVersionsHost
        });
        expect(axiosGetSpy).toHaveBeenCalled();
        expect(versions3).toMatchSnapshot();

        axiosGetSpy.mockClear();
        const versions4 = await getUI5Versions({
            useCache: true,
            snapshotVersionsHost
        });
        expect(axiosGetSpy).not.toHaveBeenCalled();
        expect(versions4).toEqual(versions3);

        axiosGetSpy.mockClear();
        const versions5 = await getUI5Versions({
            useCache: true,
            includeMaintained: true
        });
        expect(axiosGetSpy).toHaveBeenCalled();
        expect(versions5).toMatchSnapshot();

        axiosGetSpy.mockClear();
        const versions6 = await getUI5Versions({
            useCache: true,
            includeMaintained: true
        });
        expect(axiosGetSpy).not.toHaveBeenCalled();
        expect(versions5).toEqual(versions6);
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
        expect(supportedCount).toEqual(65);
        expect(notSupportedCount).toEqual(80);
        expect(versions).toMatchSnapshot();
    });
});

describe('getUI5Versions: Handle error cases while getting UI5 versions: ', () => {
    const logWarnSpy = jest.spyOn(ToolsLogger.prototype, 'warn');
    const logErrorSpy = jest.spyOn(ToolsLogger.prototype, 'error');

    beforeEach(() => {
        nock(UI5Info.OfficialUrl).get(`/${UI5Info.VersionsFile}`).reply(500, '');
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    test('UI5 versions fallback if official is not available ', async () => {
        const versions = await getUI5Versions();
        expect(versions).toMatchSnapshot();
        expect(logWarnSpy).toBeCalledTimes(1);
    });

    test('UI5 versions fallback if snapshot is not available ', async () => {
        const versions = await getUI5Versions({ snapshotVersionsHost });
        expect(versions).toMatchSnapshot();
        expect(logErrorSpy).toBeCalledTimes(1);
        expect(logWarnSpy).toBeCalledTimes(1);
    });

    test('UI5 versions fallback for v2 if official is not available ', async () => {
        const versions = await getUI5Versions({ fioriElementsVersion: FioriElementsVersion.v2 });
        expect(versions).toMatchSnapshot();
        expect(logWarnSpy).toBeCalledTimes(1);
    });

    test('UI5 versions fallback for v4 if official is not available ', async () => {
        const versions = await getUI5Versions({ fioriElementsVersion: FioriElementsVersion.v4 });
        expect(versions).toMatchSnapshot();
        expect(logWarnSpy).toBeCalledTimes(1);
    });
});

describe('getUI5Versions: Handle fatal cases while getting UI5 versions: ', () => {
    const logWarnSpy = jest.spyOn(ToolsLogger.prototype, 'warn');
    const logErrorSpy = jest.spyOn(ToolsLogger.prototype, 'error');

    beforeEach(() => {
        nock(UI5Info.OfficialUrl).get(`/${UI5Info.VersionsFile}`).replyWithError('Fatal error');
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    test('UI5 versions fallback if official is not available ', async () => {
        const versions = await getUI5Versions();
        expect(versions).toMatchSnapshot();
        expect(logWarnSpy).toBeCalledTimes(1);
    });

    test('UI5 versions fallback if snapshot is not available ', async () => {
        const versions = await getUI5Versions({ snapshotVersionsHost });
        expect(versions).toMatchSnapshot();
        expect(logErrorSpy).toBeCalledTimes(1);
        expect(logWarnSpy).toBeCalledTimes(1);
    });
});

describe('getUI5Versions: npm listed versions', () => {
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
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.79.1' }); // Sorted
        expect(retrievedUI5Versions.length).toEqual(4);
    });

    it('Validate UI5 version lists is sorted with snapshot versions', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2MixVersionsStr)));
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.79.1' }); // Sorted
        expect(retrievedUI5Versions.length).toEqual(4);
    });

    it('Return a UI5 version if a non supported version is selected', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2VersionsStr)));
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true, ui5SelectedVersion: '1.80.0' }); // Not supported
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.79.1' }); // Only return supported version from NPM
        expect(retrievedUI5Versions.length).toEqual(4); // Will remove one since its not part of the min supported versions
    });

    it('Validate UI5 NPM versions are handled for v4', async () => {
        // Return default min version
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V4VersionsStr)));
        let retrievedUI5Versions = await getUI5Versions({
            onlyNpmVersion: true,
            fioriElementsVersion: FioriElementsVersion.v4
        });
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.85.0' });
        expect(retrievedUI5Versions.length).toEqual(2); // Only return supported min version and up!

        // Part 2 - handle a selected v4 version
        retrievedUI5Versions = await getUI5Versions({
            onlyNpmVersion: true,
            ui5SelectedVersion: '1.84.1', // Supported
            fioriElementsVersion: FioriElementsVersion.v4
        });
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.84.1' }); // Is a supported version so return it
        expect(retrievedUI5Versions.length).toEqual(1);
        expect(commandRunSpy).toHaveBeenCalledTimes(2);
    });

    it('Validate UI5 version returns a supported version for a non supported selected version', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2VersionsStr)));
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
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5V2EmptyStr)));
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.65.0' }); // Return min version since NPM returns an empty string
        expect(retrievedUI5Versions.length).toEqual(1); // Will remove one since its not part of the min supported versions
    });

    it('Return a UI5 version if no npm versions are found - part 2', async () => {
        const commandRunSpy = (CommandRunner.prototype.run = jest.fn().mockResolvedValue(Promise.resolve('')));
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true, minSupportedUI5Version: '1.76.0' });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.76.0' }); // Return min version since NPM returns an empty string
        expect(retrievedUI5Versions.length).toEqual(1); // Will remove one since its not part of the min supported versions
    });

    it('Return a UI5 version with duplicate npm version', async () => {
        const ui5DuplicateVer = `['1.90.1', '1.90.1']`;
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockResolvedValue(Promise.resolve(ui5DuplicateVer)));
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(commandRunSpy).toHaveBeenCalledTimes(1);
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.90.1' });
        expect(retrievedUI5Versions.length).toEqual(2);
    });
});
