import { addVariantsManagementScript } from '../../../src/variants-config/package-json';
import { join } from 'path';
import { create as createFS } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { ToolsLogger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';

describe('addVariantsManagementScript', () => {
    let fs: Editor;
    const logger = new ToolsLogger();
    const infoLogMock = jest.spyOn(ToolsLogger.prototype, 'info').mockImplementation(() => {});
    const warnLogMock = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
    const debugLogMock = jest.spyOn(ToolsLogger.prototype, 'debug').mockImplementation(() => {});

    const basePath = join(__dirname, '../../fixtures/variants-config');
    const yamlPath = 'path/to/my/ui5.yaml';
    const customYaml = 'path/toTmy/customui5.yaml';

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

    test('update script in package.json when it already exists but is outdated', async () => {
        const deprecatedConfig = join(basePath, 'deprecated-config');
        await addVariantsManagementScript(fs, deprecatedConfig, yamlPath, logger);
        expect(warnLogMock).toHaveBeenCalledWith(
            `Script 'start-variants-management' already exists but is outdated. Script will be updated.`
        );
        expect(debugLogMock).toHaveBeenCalledWith(`Script 'start-variants-management' written to 'package.json'.`);
    });

    test('do not update script in package.json when it already exists and is up-to-date', async () => {
        const fioriToolsConfig = join(basePath, 'up-to-date-config');
        await addVariantsManagementScript(fs, fioriToolsConfig, 'myCustomUI5.yaml', logger);
        expect(infoLogMock).toHaveBeenCalledWith(`Script 'start-variants-management' is already up-to-date.`);
        expect(debugLogMock).not.toHaveBeenCalledWith(`Script 'start-variants-management' written to 'package.json'.`);
    });

    test('add no script to package.json when there is no RTA editor', async () => {
        const openSourceConfig = join(basePath, 'open-source-config');
        await expect(addVariantsManagementScript(fs, openSourceConfig, yamlPath, logger)).rejects.toThrowError(
            'No RTA editor specified in ui5.yaml.'
        );
    });

    test('no package.json file', async () => {
        const basePath = join(__dirname, '../../fixtures/a-folder-that-does-not-exist');
        await expect(addVariantsManagementScript(fs, basePath, yamlPath, logger)).rejects.toThrowError(
            `Script 'start-variants-management' cannot be written to package.json. File 'package.json' not found at ${basePath}`
        );
    });

    test('set --config flag if default ui5.yaml is not used', async () => {
        const fioriToolsConfig = join(basePath, 'up-to-date-config');
        await addVariantsManagementScript(fs, fioriToolsConfig, 'myCustomUI5.yaml', logger);
        expect(fs.readJSON(join(fioriToolsConfig, 'package.json'))).toMatchSnapshot();
    });
});
