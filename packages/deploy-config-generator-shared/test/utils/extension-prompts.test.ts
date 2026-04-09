import { jest } from '@jest/globals';
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

jest.unstable_mockModule('@sap-ux/nodejs-utils', () => ({
    findInstalledPackages: jest.fn(async () => foundGenExts),
    CommandRunner: class {}
}));

const { getExtensionGenPromptOpts } = await import('../../src/utils/extension-prompts');

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
