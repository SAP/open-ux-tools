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
    const warnLogMock = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/preview-config');
    let fs: Editor;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
    });

    test('rename default Sandboxes', async () => {
        fs.write(join(basePath, 'webapp', 'test', 'flpSandbox.html'), 'dummy content flpSandbox');
        fs.write(join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html'), 'dummy content flpSandboxMockserver');
        await renameDefaultSandboxes(fs, basePath, logger);
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
        let path = join('test', 'flpSandbox.html');
        expect(infoLogMock).toHaveBeenCalledWith(
            `Renamed '${path}' to '${path.slice(
                0,
                -5
            )}_old.html'. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`
        );
        path = join('test', 'flpSandboxMockserver.html');
        expect(infoLogMock).toHaveBeenCalledWith(
            `Renamed '${path}' to '${path.slice(
                0,
                -5
            )}_old.html'. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`
        );
    });

    test('delete no longer used files', async () => {
        fs.write(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'), 'dummy content');
        fs.write(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'), 'dummy content');
        await deleteNoLongerUsedFiles(fs, basePath, logger);
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted '${join(
                'webapp',
                'test',
                'locate-reuse-libs.js'
            )}'. This file is no longer needed for the preview.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'locate-reuse-libs.js')} doesn\'t exist`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted '${join('webapp', 'test', 'initFlpSandbox.js')}'. This file is no longer needed for the preview.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'initFlpSandbox.js')} doesn\'t exist`
        );
    });

    test('skip renaming for files which do not exist', async () => {
        const script = `fiori run --open \"test/IdoNotExist.html?sap-ui-xx-viewCache=false#checken-head\"`;

        await renameSandbox(fs, basePath, script, logger);
        expect(warnLogMock).toHaveBeenCalledWith(`File 'test/IdoNotExist.html' not found. Skipping renaming.`);
    });

    test('skip renaming for files which have already been renamed', async () => {
        const script = `fiori run --open \"test/ImAlreadyRenamed.html?sap-ui-xx-viewCache=false#checken-head\"`;

        fs.write(join(basePath, 'webapp', 'test', 'ImAlreadyRenamed.html'), 'dummy content flpSandbox');

        await renameSandbox(fs, basePath, script, logger);
        expect(infoLogMock).toHaveBeenCalledWith(
            `Renamed 'test/ImAlreadyRenamed.html' to 'test/ImAlreadyRenamed_old.html'. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`
        );

        await renameSandbox(fs, basePath, script, logger);
        expect(debugLogMock).toHaveBeenCalledWith(
            `File 'test/ImAlreadyRenamed.html' has already been renamed. Skipping renaming.`
        );
    });
});
