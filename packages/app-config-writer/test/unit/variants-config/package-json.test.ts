import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create, create as createFS } from 'mem-fs-editor';
import { addVariantsManagementScript } from '../../../src/variants-config/package-json';
import type { ToolsLogger } from '@sap-ux/logger';

describe('Test for adding start-variants-management script in package.json', () => {
    test('Add new start-variants-management script to package.json and keep the existing one', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/app-with-client-in-script');
        const fs = createFS(createStorage());
        await addVariantsManagementScript(fs, basePath);
        expect(fs.readJSON(join(basePath, 'package.json'))).toEqual({
            'name': 'app-client',
            'scripts': {
                'start': 'fiori run --open "test/flpSandbox.html?sap-client=100&sap-ui-xx-viewCache=false#test-tile"',
                'start-variants-management': `fiori run --open \"preview.html?fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true&sap-client=100#app-preview\"`
            }
        });
    });

    test('No sap client present in script', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/simple-app/');
        const fs = createFS(createStorage());
        interface PackageJson {
            scripts?: {
                [key: string]: string;
            };
        }
        await addVariantsManagementScript(fs, basePath);
        const script = fs.readJSON(join(basePath, 'package.json')) as PackageJson;
        expect(script?.scripts?.['start-variants-management']?.includes('sap-client=100')).toEqual(false);
    });

    test('Add script to package.json when there is no script', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/simple-app/');
        const fs = createFS(createStorage());
        const loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        await addVariantsManagementScript(fs, basePath, loggerMock);
        expect(loggerMock.warn).toHaveBeenCalledWith(
            `File 'package.json' does not contain a script section. Script section added.`
        );
    });

    test('No script inserted to package.json when there is already a script', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/deprecated-config/');
        const fs = createFS(createStorage());
        const loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        await addVariantsManagementScript(fs, basePath, loggerMock);
        expect(loggerMock.warn).toHaveBeenCalledWith(
            `Script 'start-variants-management' cannot be written to 'package.json. Script already exists'.`
        );
    });
});

describe('addVariantsManagementScript', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');
    const legacyBasePath = join(__dirname, '../../fixtures/variants-config/deprecated-config');

    const loggerMock: ToolsLogger = { debug: jest.fn() } as Partial<ToolsLogger> as ToolsLogger;
    let fs: Editor;
    let debugMock: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        debugMock = loggerMock.debug as any;
    });

    test('add variants-management script to package.json', async () => {
        await addVariantsManagementScript(fs, basePath, loggerMock);
        expect(debugMock.mock.calls[0][0]).toEqual(`Script 'start-variants-management' written to 'package.json'.`);
    });
});
