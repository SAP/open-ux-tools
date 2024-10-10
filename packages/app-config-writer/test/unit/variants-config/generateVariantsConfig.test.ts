import { join } from 'path';
import { generateVariantsConfig } from '../../../src';
import { ToolsLogger } from '@sap-ux/logger';

describe('generateVariantsConfig', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('add variants configuration to a project', async () => {
        const fs = await generateVariantsConfig(basePath);
        expect(fs.readJSON(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('adding variants configuration to a non existing project', async () => {
        const errorLogMock = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
        const basePath = join(__dirname, '../../fixtures/a-folder-that-does-not-exist');
        const fs = await generateVariantsConfig(basePath, new ToolsLogger());
        expect(errorLogMock).toHaveBeenCalledWith(
            `Script 'start-variants-management' cannot be written to package.json. File 'package.json' not found at ${basePath}.`
        );
    });
});
