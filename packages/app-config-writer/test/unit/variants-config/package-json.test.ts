import { addVariantsManagementScript } from '../../../src/variants-config/package-json';
import { join } from 'path';
import { create as createFS } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { ToolsLogger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';

describe('addVariantsManagementScript', () => {
    let fs: Editor;
    const logger = new ToolsLogger();
    const warnLogMock = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
    const debugLogMock = jest.spyOn(ToolsLogger.prototype, 'debug').mockImplementation(() => {});

    const basePath = join(__dirname, '../../fixtures/variants-config');
    const yamlPath = 'path/to/my/ui5.yaml';
    beforeEach(() => {
        jest.clearAllMocks();
        fs = createFS(createStorage());
    });

    test('add start-variants-management script to package.json', async () => {
        const fioriToolsConfig = join(basePath, 'fiori-tools-config');
        await addVariantsManagementScript(fs, fioriToolsConfig, yamlPath, logger);

        expect(debugLogMock).toHaveBeenCalledWith(`Script 'start-variants-management' written to 'package.json'.`);
        expect(fs.readJSON(join(fioriToolsConfig, 'package.json'))).toMatchSnapshot();
    });

    test('add script to package.json when there is no script section', async () => {
        await addVariantsManagementScript(fs, basePath, yamlPath, logger);
        expect(warnLogMock).toHaveBeenCalledWith(
            `File 'package.json' does not contain a script section. Script section added.`
        );
        expect(debugLogMock).toHaveBeenCalledWith(`Script 'start-variants-management' written to 'package.json'.`);
    });

    test('add no script to package.json when there is already a script', async () => {
        const deprecatedConfig = join(basePath, 'deprecated-config');
        await expect(addVariantsManagementScript(fs, deprecatedConfig, yamlPath, logger)).rejects.toThrowError(
            'Script already exists.'
        );
    });

    test('add no script to package.json when there is no RTA editor', async () => {
        const openSourceConfig = join(basePath, 'open-source-config');
        await expect(addVariantsManagementScript(fs, openSourceConfig, yamlPath, logger)).rejects.toThrowError(
            'No RTA editor specified in ui5.yaml.'
        );
    });
});
