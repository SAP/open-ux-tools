import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';
import { updateMiddlewares } from '../../../src/variants-config/ui5-yaml';

const middlewareUpdatedMessage = (
    middleware: 'preview' | 'reload',
    filename: 'ui5-mock.yaml' | 'ui5-local.yaml' | 'ui5.yaml'
) => `Updated ${middleware} middleware in ${filename}.`;

const noFileMessage = (filename: 'ui5-mock.yaml' | 'ui5-local.yaml') =>
    `Cannot write variants-config to ${filename}. File not existing`;

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
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', 'ui5.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage('ui5-mock.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage('ui5-local.yaml'));
    });

    test('add preview and reload middleware config to ui5.yaml file', async () => {
        const openSourceConfig = join(basePath, 'open-source-config');
        await updateMiddlewares(fs, openSourceConfig, logger);

        expect(fs.read(join(openSourceConfig, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', 'ui5.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', 'ui5.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage('ui5-mock.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(noFileMessage('ui5-local.yaml'));
    });

    test('add preview and reload middleware to local ui5.yaml files', async () => {
        const fioriToolsConfig = join(basePath, 'fiori-tools-config');
        await updateMiddlewares(fs, fioriToolsConfig, logger);

        expect(debugLogMock).toHaveBeenCalledTimes(6);
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', 'ui5.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', 'ui5-local.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('preview', 'ui5-mock.yaml'));

        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', 'ui5.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', 'ui5-local.yaml'));
        expect(debugLogMock).toHaveBeenCalledWith(middlewareUpdatedMessage('reload', 'ui5-mock.yaml'));
    });
});
