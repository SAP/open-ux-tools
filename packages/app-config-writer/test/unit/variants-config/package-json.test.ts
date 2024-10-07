import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create, create as createFS } from 'mem-fs-editor';
import { addVariantsManagementScript } from '../../../src/variants-config/package-json';
import { ToolsLogger } from '@sap-ux/logger';

describe('Test for adding start-variants-management script in package.json', () => {
    const logger = new ToolsLogger();
    let fs: Editor;
    const warnLogMock = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
    const debugLogMock = jest.spyOn(ToolsLogger.prototype, 'debug').mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
        fs = createFS(createStorage());
    });

    test('Add new start-variants-management script to package.json and keep the existing one', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/app-with-client-in-script');
        await addVariantsManagementScript(fs, basePath, logger);
        expect(fs.readJSON(join(basePath, 'package.json'))).toEqual({
            'name': 'app-client',
            'scripts': {
                'start': 'fiori run --open "test/flpSandbox.html?sap-client=100&sap-ui-xx-viewCache=false#test-tile"',
                'start-variants-management': `fiori run --open \"preview.html?fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true&sap-client=100#app-preview\"`
            }
        });
        expect(debugLogMock).toHaveBeenCalledWith(`Script 'start-variants-management' written to 'package.json'.`);
    });

    test('No sap client present in script', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/simple-app/');
        interface PackageJson {
            scripts?: {
                [key: string]: string;
            };
        }
        await addVariantsManagementScript(fs, basePath, logger);
        const script = fs.readJSON(join(basePath, 'package.json')) as PackageJson;
        expect(script?.scripts?.['start-variants-management']?.includes('sap-client=100')).toEqual(false);
        expect(debugLogMock).toHaveBeenCalledWith(`Script 'start-variants-management' written to 'package.json'.`);
    });

    test('Add script to package.json when there is no script', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/simple-app/');
        await addVariantsManagementScript(fs, basePath, logger);
        expect(warnLogMock).toHaveBeenCalledWith(
            `File 'package.json' does not contain a script section. Script section added.`
        );
        expect(debugLogMock).toHaveBeenCalledWith(`Script 'start-variants-management' written to 'package.json'.`);
    });

    test('No script inserted to package.json when there is already a script', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/deprecated-config/');
        await addVariantsManagementScript(fs, basePath, logger);
        expect(warnLogMock).toHaveBeenCalledWith(
            `Script 'start-variants-management' cannot be written to 'package.json. Script already exists'.`
        );
    });
});
