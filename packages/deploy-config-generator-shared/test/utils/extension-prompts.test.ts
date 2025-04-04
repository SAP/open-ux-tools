import { getExtensionGenPromptOpts } from '../../src';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';

const foundGenExts = [
    {
        path: 'path/to/extension-generator',
        packageJsonPath: 'path/to/package.json',
        packageInfo: {
            name: 'extension-generator',
            version: '1.0.0'
        }
    }
];

jest.mock('@sap-ux/nodejs-utils', () => ({
    ...(jest.requireActual('@sap-ux/nodejs-utils') as object),
    findInstalledPackages: jest.fn(async () => foundGenExts) // Prevents searching for extensions
}));

describe('Test extension prompts', () => {
    it('should return the extension prompt options', async () => {
        const rootGeneratorName = 'root-generator';

        const mockGenExt = {
            _getExtensions: jest.fn().mockReturnValue({
                [rootGeneratorName]: {
                    prompt1: {
                        additionalMessage: 'Extended prompt message'
                    }
                }
            })
        };

        const createEnv = jest.fn().mockReturnValue(mockGenExt);
        const vscode = {} as VSCodeInstance;

        const result = await getExtensionGenPromptOpts(createEnv, rootGeneratorName, vscode);
        expect(result).toEqual({
            prompt1: {
                additionalMessage: 'Extended prompt message'
            }
        });
    });
});
