import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';
import { updateMiddlewares } from '../../../src/variants-config/ui5-yaml';
import { FileName } from '@sap-ux/project-access';

const middlewareUpdatedMessage = (middleware: 'preview' | 'reload', filename: string) =>
    `Updated ${middleware} middleware in ${filename}.`;

describe('Test update middleware', () => {
    const logger = new ToolsLogger();
    let fs: Editor;
    const debugLogMock = jest.spyOn(ToolsLogger.prototype, 'debug').mockImplementation(() => {});
    const warnLogMock = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/variants-config');
    const yamlPath = 'path/to/my/ui5.yaml';

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
    });

    test('add preview middleware config to ui5.yaml file', async () => {
        await updateMiddlewares(fs, basePath, yamlPath, logger);

        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
    });

    test('add preview-middleware to ui5.yaml file w/o middlewares', async () => {
        const missingMiddlewareConfigPath = join(basePath, 'no-middleware-config-os');
        await updateMiddlewares(fs, missingMiddlewareConfigPath, yamlPath, logger);

        expect(fs.read(join(missingMiddlewareConfigPath, 'ui5.yaml'))).toMatchSnapshot();
        expect(warnLogMock).toHaveBeenCalledWith(
            `No preview middleware found in ${FileName.Ui5Yaml}. Preview middleware will be added.`
        );
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
    });

    test('add fiori-tools-preview to ui5.yaml file w/o middlewares', async () => {
        const missingMiddlewareConfigPath = join(basePath, 'no-middleware-config');
        await updateMiddlewares(fs, missingMiddlewareConfigPath, yamlPath, logger);

        expect(fs.read(join(missingMiddlewareConfigPath, 'ui5.yaml'))).toMatchSnapshot();
        expect(warnLogMock).toHaveBeenCalledWith(
            `No preview middleware found in ${FileName.Ui5Yaml}. Preview middleware will be added.`
        );
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
    });

    test('add preview and reload middleware config to ui5.yaml file', async () => {
        const openSourceConfigPath = join(basePath, 'open-source-config');
        await updateMiddlewares(fs, openSourceConfigPath, yamlPath, logger);

        expect(fs.read(join(openSourceConfigPath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', FileName.Ui5Yaml));
    });

    test('add preview and reload middleware to local ui5.yaml files', async () => {
        const fioriToolsConfig = join(basePath, 'fiori-tools-config');
        await updateMiddlewares(fs, fioriToolsConfig, yamlPath, logger);

        expect(debugLogMock).toHaveBeenCalledTimes(2);
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', FileName.Ui5Yaml));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', FileName.Ui5Yaml));
    });
});
