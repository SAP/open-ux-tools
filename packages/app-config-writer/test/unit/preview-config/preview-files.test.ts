import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import {
    renameDefaultSandboxes,
    deleteNoLongerUsedFiles,
    renameSandbox
} from '../../../src/preview-config/preview-files';
import { ToolsLogger } from '@sap-ux/logger';

describe('preview-files', () => {
    const logger = new ToolsLogger();
    const debugLogMock = jest.spyOn(ToolsLogger.prototype, 'debug').mockImplementation(() => {});
    const infoLogMock = jest.spyOn(ToolsLogger.prototype, 'info').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/preview-config');
    let fs: Editor;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
    });

    test('rename default Sandboxes', async () => {
        const flpSandboxPath = join(basePath, 'webapp', 'test', 'flpSandbox.html');
        const flpSandboxMockserverPath = join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html');
        fs.write(flpSandboxPath, 'dummy content flpSandbox');
        fs.write(flpSandboxMockserverPath, 'dummy content flpSandboxMockserver');
        await renameDefaultSandboxes(fs, basePath, logger);
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'flpSandbox.html'))).toThrowError(
            `${flpSandboxPath} doesn\'t exist`
        );
        expect(fs.read(join(basePath, 'webapp', 'test', 'flpSandbox_old.html'))).toMatchInlineSnapshot(
            '"dummy content flpSandbox"'
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html'))).toThrowError(
            `${flpSandboxMockserverPath} doesn\'t exist`
        );
        expect(fs.read(join(basePath, 'webapp', 'test', 'flpSandboxMockserver_old.html'))).toMatchInlineSnapshot(
            '"dummy content flpSandboxMockserver"'
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Renamed '${join('test', 'flpSandbox.html')}' to '${join(
                'test',
                'flpSandbox_old.html'
            )}'. This file is no longer needed for the virtual endpoints. If you have not modified this file, you can delete it. If you have modified this file, move the modified content to a custom init script for the preview middleware. For more information, see https://github.com/SAP/open-ux-tools/tree/main/packages/preview-middleware#migration.`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Renamed '${join('test', 'flpSandboxMockserver.html')}' to '${join(
                'test',
                'flpSandboxMockserver_old.html'
            )}'. This file is no longer needed for the virtual endpoints. If you have not modified this file, you can delete it. If you have modified this file, move the modified content to a custom init script for the preview middleware. For more information, see https://github.com/SAP/open-ux-tools/tree/main/packages/preview-middleware#migration.`
        );
    });

    test('delete no longer used files w/o test files', async () => {
        fs.write(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'), 'dummy content');
        fs.write(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'), 'dummy content');
        await deleteNoLongerUsedFiles(fs, basePath, false, logger);
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted the 'locate-reuse-libs.js' file. This file is no longer needed for the virtual endpoints.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'locate-reuse-libs.js')} doesn\'t exist`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted the 'initFlpSandbox.js' file. This file is no longer needed for the virtual endpoints.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'initFlpSandbox.js')} doesn\'t exist`
        );
    });

    test('delete no longer used files with test files', async () => {
        fs.write(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'), 'dummy content');
        fs.write(join(basePath, 'webapp', 'test', 'testsuite.qunit.js'), 'dummy content');
        fs.write(join(basePath, 'webapp', 'test', 'integration', 'opaTests.qunit.js'), 'dummy content');
        fs.write(join(basePath, 'webapp', 'test', 'unit', 'unitTests.qunit.js'), 'dummy content');
        await deleteNoLongerUsedFiles(fs, basePath, true, logger);
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'locate-reuse-libs.js')} doesn\'t exist`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted the 'initFlpSandbox.js' file. This file is no longer needed for the virtual endpoints.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'initFlpSandbox.js')} doesn\'t exist`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted the 'testsuite.qunit.js' file. This file is no longer needed for the virtual endpoints.`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted the 'opaTests.qunit.js' file. This file is no longer needed for the virtual endpoints.`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted the 'unitTests.qunit.js' file. This file is no longer needed for the virtual endpoints.`
        );
    });

    test('skip renaming for files which do not exist', async () => {
        const path = join('test', 'IdoNotExist.html');

        await renameSandbox(fs, basePath, path, logger);
        expect(debugLogMock).toHaveBeenCalledWith(`The file '${path}', has not been found. Skipping renaming.`);
    });

    test('skip renaming for files which have already been renamed', async () => {
        const path = join('test', 'ImAlreadyRenamed.html');

        fs.write(join(basePath, 'webapp', 'test', 'ImAlreadyRenamed.html'), 'dummy content flpSandbox');

        await renameSandbox(fs, basePath, path, logger);
        expect(infoLogMock).toHaveBeenCalledWith(
            `Renamed '${path}' to '${path.slice(
                0,
                -5
            )}_old.html'. This file is no longer needed for the virtual endpoints. If you have not modified this file, you can delete it. If you have modified this file, move the modified content to a custom init script for the preview middleware. For more information, see https://github.com/SAP/open-ux-tools/tree/main/packages/preview-middleware#migration.`
        );

        await renameSandbox(fs, basePath, path, logger);
        expect(debugLogMock).toHaveBeenCalledWith(`The file '${path}', has already been renamed. Skipping renaming.`);
    });
});
