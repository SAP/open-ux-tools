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
    const basePath = join(__dirname, '../../fixtures/variants-config');

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
    });

    test('add preview middleware config to ui5.yaml file', async () => {
        await updateMiddlewares(fs, basePath, logger);

        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage(FileName.Ui5MockYaml));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage(FileName.Ui5LocalYaml));
    });

    test('add preview and reload middleware config to ui5.yaml file', async () => {
        const openSourceConfig = join(basePath, 'open-source-config');
        await updateMiddlewares(fs, openSourceConfig, logger);

        expect(fs.read(join(openSourceConfig, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage(FileName.Ui5MockYaml));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage(FileName.Ui5LocalYaml));
    });

    test('add preview and reload middleware to local ui5.yaml files', async () => {
        const fioriToolsConfig = join(basePath, 'fiori-tools-config');
        await updateMiddlewares(fs, fioriToolsConfig, logger);

        expect(debugLogMock).toHaveBeenCalledTimes(6);
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5LocalYaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5MockYaml));

        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', FileName.Ui5LocalYaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', FileName.Ui5MockYaml));
    });
});
