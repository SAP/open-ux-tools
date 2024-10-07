import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';
import { updateMiddlewares } from '../../../src/variants-config/ui5-yaml';
import { FileName } from '@sap-ux/project-access';

type YamlFileName = typeof FileName.Ui5MockYaml | typeof FileName.Ui5LocalYaml | typeof FileName.Ui5Yaml;

const middlewareUpdatedMessage = (middleware: 'preview' | 'reload', filename: YamlFileName) =>
    `Updated ${middleware} middleware in ${filename}.`;

const noFileMessage = (filename: YamlFileName) => `Cannot write variants-config to ${filename}. File not existing`;

describe('Test update middleware', () => {
    const logger = new ToolsLogger();
    let fs: Editor;
    const debugLogMock = jest.spyOn(ToolsLogger.prototype, 'debug').mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
    });

    test('ui5.yaml - add fiori-tools-preview', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/simple-app/');
        await updateMiddlewares(fs, basePath, logger);
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugLogMock).toHaveBeenCalledTimes(3);
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage(FileName.Ui5MockYaml));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage(FileName.Ui5LocalYaml));
    });

    test('ui5.yaml - do nothing when fiori-tools-preview is present', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/app-with-client-in-script/');
        await updateMiddlewares(fs, basePath, logger);
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugLogMock).toHaveBeenCalledTimes(3);
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage(FileName.Ui5MockYaml));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage(FileName.Ui5LocalYaml));
    });

    test('ui5-mock.yaml - add fiori-tools-appreload', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/app-with-reload-middleware/');
        await updateMiddlewares(fs, basePath, logger);
        expect(fs.read(join(basePath, 'ui5-mock.yaml'))).toMatchSnapshot();
        expect(debugLogMock).toHaveBeenCalledTimes(4);
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', FileName.Ui5MockYaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5MockYaml));
    });
});
