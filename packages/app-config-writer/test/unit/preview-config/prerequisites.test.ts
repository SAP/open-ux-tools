import { checkPrerequisites } from '../../../src/preview-config/prerequisites';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'node:path';
import { ToolsLogger } from '@sap-ux/logger';
import * as ProjectAccess from '@sap-ux/project-access';

describe('prerequisites', () => {
    const logger = new ToolsLogger();
    const errorLogMock = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
    const warnLogMock = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/preview-config');
    jest.spyOn(ProjectAccess, 'findCapProjectRoot').mockResolvedValue(basePath);
    const fs = create(createStorage());

    beforeEach(() => {
        jest.clearAllMocks();
        fs.delete(join(basePath, 'various-configs', 'package.json'));
        jest.spyOn(ProjectAccess, 'checkCdsUi5PluginEnabled').mockResolvedValue(true);
    });

    test('check prerequisites w/o package.json', async () => {
        await expect(async () => checkPrerequisites(basePath, fs, false, logger)).rejects.toThrow();
    });

    test('check prerequisites with bestpractice build dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@sap/grunt-sapui5-bestpractice-build': '1.0.0' } })
        );

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            "Conversion from '@sap/grunt-sapui5-bestpractice-build' is not supported. You must migrate to UI5 CLI version 3.0.0 or higher. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3."
        );
    });

    test('check prerequisites with UI5 cli 2.0 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '2.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3.'
        );
    });

    test('check prerequisites with invalid UI5 cli dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': 'foo' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeFalsy();
    });

    test('check prerequisites with UI5 cli 3.0 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '3.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test('check prerequisites with UI5 cli 4.0 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '4.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test('check prerequisites with UI5 cli ^3 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '^3' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test('check prerequisites with UI5 cli ^2 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '^2' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3.'
        );
    });

    test('check prerequisites with UI5 cli ^4 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '^4' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test('check prerequisites with UI5 ux-ui5-tooling 1.16.0 dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: { '@sap/ux-ui5-tooling': '1.16.0', '@ui5/cli': '^3' }
            })
        );

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test('check prerequisites with UI5 ux-ui5-tooling 1 dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: { '@sap/ux-ui5-tooling': '1', '@ui5/cli': '^3' }
            })
        );

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test("check prerequisites with UI5 ux-ui5-tooling 'latest' dependency", async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: { '@sap/ux-ui5-tooling': 'latest', '@ui5/cli': '^3' }
            })
        );

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test('check prerequisites with UI5 ux-ui5-tooling 1.15.0 dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@sap/ux-ui5-tooling': '1.15.0' } })
        );

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            'UX UI5 Tooling version 1.15.4 or higher is required to convert the preview to virtual files. For more information, see https://www.npmjs.com/package/@sap/ux-ui5-tooling.'
        );
    });

    test('check prerequisites w/o mockserver dependency', async () => {
        jest.spyOn(ProjectAccess, 'checkCdsUi5PluginEnabled').mockResolvedValue(false);
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '3.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            "Conversion from 'sap/ui/core/util/MockServer' or '@sap/ux-ui5-fe-mockserver-middleware' is not supported. You must migrate to '@sap-ux/ui5-middleware-fe-mockserver' first. For more information, see https://www.npmjs.com/package/@sap-ux/ui5-middleware-fe-mockserver."
        );
    });

    test('check prerequisites w/o mockserver dependency but with cds-plugin-ui5 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '3.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test('check prerequisites fulfilled', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: { '@ui5/cli': '3.0.0', '@sap-ux/ui5-middleware-fe-mockserver': '6.6.6' }
            })
        );

        expect(await checkPrerequisites(basePath, fs, false, logger)).toBeTruthy();
    });

    test('check prerequisites fulfilled with karma', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: {
                    '@ui5/cli': '3.0.0',
                    '@sap-ux/ui5-middleware-fe-mockserver': '6.6.6',
                    'karma-ui5': '1.1.1'
                }
            })
        );

        expect(await checkPrerequisites(basePath, fs, true, logger)).toBeTruthy();
        expect(warnLogMock).toHaveBeenCalledWith(
            "This app seems to use Karma as a test runner. Please note that the converter does not convert any Karma configuration files. Please update your karma configuration ('ui5.configPath' and 'ui5.testpage') according to the new virtual endpoints after the conversion."
        );
    });

    test('check prerequisites fulfilled with WebdriverIO QUnit Service', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: {
                    '@ui5/cli': '3.0.0',
                    '@sap-ux/ui5-middleware-fe-mockserver': '6.6.6',
                    'wdio-qunit-service': '1.1.1'
                }
            })
        );

        expect(await checkPrerequisites(basePath, fs, true, logger)).toBeTruthy();
        expect(warnLogMock).toHaveBeenCalledWith(
            'This app seems to use the WebdriverIO QUnit Service as a test runner. Please note that the converter does not convert any WebdriverIO configuration files. Please update your WebdriverIO QUnit Service test paths according to the new virtual endpoints after the conversion.'
        );
    });
});
