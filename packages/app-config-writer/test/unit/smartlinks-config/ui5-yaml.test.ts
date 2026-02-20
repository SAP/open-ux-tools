import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import { UI5Config } from '@sap-ux/ui5-config';
import type { ToolsLogger } from '@sap-ux/logger';
import * as projectAccessMock from '@sap-ux/project-access';
import { readUi5DeployConfigTarget, addUi5YamlServeStaticMiddleware } from '../../../src/smartlinks-config/ui5-yaml';

describe('Test readUi5DeployConfigTarget', () => {
    test('existing ui5-deploy.yaml', async () => {
        const basePath = join(__dirname, '../../fixtures/ui5-smartlinks-config');
        const result = await readUi5DeployConfigTarget(basePath);
        expect(result.target).toEqual({
            'destination': 'ABC123',
            'url': 'https://abc.example'
        });
        expect(result.ignoreCertErrors).toBe(false);
    });
    test('non-existing ui5-deploy.yaml', async () => {
        const basePath = join(__dirname, '../../fixtures/no-ui5-config');
        try {
            await readUi5DeployConfigTarget(basePath);
            fail('Error should have been thrown');
        } catch (error) {
            expect(error.message).toContain(`File 'ui5-deploy.yaml' not found`);
        }
    });
    test('non-existing `deploy-to-abap` in ui5-deploy.yaml', async () => {
        jest.spyOn(projectAccessMock, 'readUi5Yaml').mockResolvedValueOnce(await UI5Config.newInstance(''));
        const basePath = join(__dirname, '../../fixtures/no-ui5-config');
        try {
            await readUi5DeployConfigTarget(basePath);
            fail('Error should have been thrown');
        } catch (error) {
            expect(error.message).toContain('No target definition found: ui5-deploy.yaml');
        }
    });
});

describe('Test addUi5YamlServeStaticMiddleware', () => {
    const loggerMock: ToolsLogger = { debug: jest.fn() } as Partial<ToolsLogger> as ToolsLogger;
    let fs: Editor;
    let debugMock: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        debugMock = loggerMock.debug as any;
    });

    test('ui5.yaml - add fiori-tools-servestatic', async () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        await addUi5YamlServeStaticMiddleware(basePath, fs, loggerMock);
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugMock.mock.calls[0][0]).toMatchInlineSnapshot(`"File ui5-mock.yaml not existing"`);
        expect(debugMock.mock.calls[1][0]).toMatchInlineSnapshot(`"File ui5-local.yaml not existing"`);
    });
    test('ui5.yaml - existing fiori-tools-servestatic', async () => {
        const basePath = join(__dirname, '../../fixtures/ui5-smartlinks-config');
        await addUi5YamlServeStaticMiddleware(basePath, fs, loggerMock);
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
        expect(debugMock.mock.calls.length).toBe(1);
    });
    test('ui5-local.yaml - add fiori-tools-proxy', async () => {
        const basePath = join(__dirname, '../../fixtures/ui5-smartlinks-config');
        await addUi5YamlServeStaticMiddleware(basePath, fs, loggerMock);
        expect(fs.read(join(basePath, 'ui5-local.yaml'))).toMatchSnapshot();
        expect(debugMock.mock.calls.length).toBe(1);
    });
});
