import { checkPrerequisites } from '../../../src/preview-config/prerequisites';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';

describe('prerequisites', () => {
    const logger = new ToolsLogger();
    const errorLogMock = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/preview-config');
    const fs = create(createStorage());

    beforeEach(() => {
        jest.clearAllMocks();
        fs.delete(join(basePath, 'various-configs', 'package.json'));
    });

    test('check prerequisites w/o package.json', async () => {
        await expect(async () => checkPrerequisites(basePath, fs, logger)).rejects.toThrow();
    });

    test('check prerequisites with bestpractice build dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@sap/grunt-sapui5-bestpractice-build': '1.0.0' } })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            "Conversion from '@sap/grunt-sapui5-bestpractice-build' is not supported. You must migrate to UI5 CLI version 3.0.0 or higher. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3."
        );
    });

    test('check prerequisites with UI5 cli 2.0 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '2.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3.'
        );
    });

    test('check prerequisites with UI5 cli ^3 dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@ui5/cli': '^3', 'cds-plugin-ui5': '6.6.6' } })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeTruthy();
    });

    test('check prerequisites with UI5 cli ^2 dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@ui5/cli': '^2', 'cds-plugin-ui5': '6.6.6' } })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3.'
        );
    });

    test('check prerequisites w/o mockserver dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '3.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            "Conversion from 'sap/ui/core/util/MockServer' is not supported. You must migrate from '@sap-ux/ui5-middleware-fe-mockserver'. For more information, see https://www.npmjs.com/package/@sap-ux/ui5-middleware-fe-mockserver."
        );
    });

    test('check prerequisites w/o mockserver dependency but with cds-plugin-ui5 dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@ui5/cli': '3.0.0', 'cds-plugin-ui5': '6.6.6' } })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeTruthy();
    });

    test('check prerequisites fulfilled', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: { '@ui5/cli': '3.0.0', '@sap-ux/ui5-middleware-fe-mockserver': '6.6.6' }
            })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeTruthy();
    });
});
