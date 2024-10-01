import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import type { ToolsLogger } from '@sap-ux/logger';
import { updateMiddlewares } from '../../../src/variants-config/ui5-yaml';

describe('Test update middleware', () => {
    const loggerMock: ToolsLogger = { debug: jest.fn() } as Partial<ToolsLogger> as ToolsLogger;
    let fs: Editor;
    let debugMock: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        debugMock = loggerMock.debug as any;
    });

    test('ui5.yaml - add fiori-tools-preview', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/simple-app/');
        await updateMiddlewares(fs, basePath, loggerMock);
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugMock.mock.calls[0][0]).toMatchInlineSnapshot(`"Updated preview middleware in ui5.yaml."`);
        expect(debugMock.mock.calls[1][0]).toMatchInlineSnapshot(
            `"Cannot write variants-config to ui5-mock.yaml. File not existing"`
        );
    });

    test('ui5.yaml - do nothing when fiori-tools-preview is present', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/app-with-client-in-script/');
        await updateMiddlewares(fs, basePath, loggerMock);
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugMock.mock.calls[0][0]).toMatchInlineSnapshot(`"Updated preview middleware in ui5.yaml."`);
        expect(debugMock.mock.calls[1][0]).toMatchInlineSnapshot(
            `"Cannot write variants-config to ui5-mock.yaml. File not existing"`
        );
    });

    test('ui5-mock.yaml - add fiori-tools-appreload', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/app-with-reload-middleware/');
        await updateMiddlewares(fs, basePath, loggerMock);
        expect(fs.read(join(basePath, 'ui5-mock.yaml'))).toMatchSnapshot();
        expect(debugMock.mock.calls[0][0]).toMatchInlineSnapshot(`"Updated preview middleware in ui5.yaml."`);
        expect(debugMock.mock.calls[1][0]).toMatchInlineSnapshot(`"Updated reload middleware in ui5-mock.yaml."`);
    });
});
