import { join } from 'path';
import { renameSandboxes, deleteNoLongerUsedFiles, checkPrerequisites } from '../../../src/preview-config';
import { ToolsLogger } from '@sap-ux/logger';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

describe('convertPreview', () => {
    const logger = new ToolsLogger();
    const errorLogMock = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
    const infoLogMock = jest.spyOn(ToolsLogger.prototype, 'info').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/preview-config');
    const fs = create(createStorage());
    fs.write(join(basePath, 'webapp', 'test', 'flpSandbox.html'), 'dummy content flpSandbox');
    fs.write(join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html'), 'dummy content flpSandboxMockserver');
    fs.write(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'), 'dummy content');
    fs.write(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'), 'dummy content');

    beforeEach(() => {
        jest.clearAllMocks();
        fs.delete(join(basePath, 'package.json'));
    });

    test('rename Sandboxes', async () => {
        await renameSandboxes(fs, basePath);
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'flpSandbox.html'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'flpSandbox.html')} doesn\'t exist`
        );
        expect(fs.read(join(basePath, 'webapp', 'test', 'flpSandbox_old.html'))).toMatchInlineSnapshot(
            '"dummy content flpSandbox"'
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html')} doesn\'t exist`
        );
        expect(fs.read(join(basePath, 'webapp', 'test', 'flpSandboxMockserver_old.html'))).toMatchInlineSnapshot(
            '"dummy content flpSandboxMockserver"'
        );
    });

    test('delete no longer used files', async () => {
        await deleteNoLongerUsedFiles(fs, basePath, logger);
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted ${join('webapp', 'test', 'locate-reuse-libs.js')}. This file is no longer needed for the preview.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'locate-reuse-libs.js')} doesn\'t exist`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted ${join('webapp', 'test', 'initFlpSandbox.js')}. This file is no longer needed for the preview.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'initFlpSandbox.js')} doesn\'t exist`
        );
    });

    test('check prerequisites with bestpractice build dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@sap/grunt-sapui5-bestpractice-build': '1.0.0' } })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            "A conversion from '@sap/grunt-sapui5-bestpractice-build' is not supported. Please migrate to UI5 CLI version 3.0.0 or higher first. See https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/ for more information."
        );
    });

    test('check prerequisites with UI5 cli 2.0 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '2.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. See https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/ for more information.'
        );
    });

    test('check prerequisites w/o mockserver dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '3.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            "A conversion from 'sap/ui/core/util/MockServer' is not supported. Please migrate to '@sap-ux/ui5-middleware-fe-mockserver' first (details see https://www.npmjs.com/package/@sap-ux/ui5-middleware-fe-mockserver)."
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
