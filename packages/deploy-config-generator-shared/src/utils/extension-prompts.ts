import { findInstalledPackages } from '@sap-ux/nodejs-utils';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';
import type { GeneratorOptions } from 'yeoman-generator';
import type { CommonPromptOptions } from '@sap-ux/inquirer-common';

/**
 * Find fiori generator extension generators and return the path to the first one found.
 *
 * @param vscode - instance of vscode
 * @returns - the path to the extension generator
 */
async function getExtensionGenPath(vscode?: VSCodeInstance): Promise<string | undefined> {
    let extensionGenPath;
    // Find generator extensions
    const foundSubGens = await findInstalledPackages('fiori-gen-ext', {
        keyword: 'fiori-generator-extension',
        vscWorkspaceConfig: vscode?.workspace?.getConfiguration()
    });
    if (foundSubGens.length > 0) {
        extensionGenPath = foundSubGens?.[0].path;
    }
    return extensionGenPath;
}

/**
 * Loads the fiori generator extension and returns the extension prompt options.
 * This a lightweight temp version for loading the extension generator prompts options.
 *
 * @param createEnv - the env create function from yeoman generator
 * @param rootGeneratorName - the name of the root generator
 * @param vscode - instance of vscode
 * @returns - the extension prompt options
 */
export async function getExtensionGenPromptOpts(
    createEnv: GeneratorOptions['env.create'],
    rootGeneratorName: string,
    vscode?: VSCodeInstance
): Promise<Record<string, CommonPromptOptions> | undefined> {
    let extGenPromptOpts;
    const extensionGenPath = await getExtensionGenPath(vscode);
    if (extensionGenPath) {
        const generatorExtension = createEnv(extensionGenPath, []) as any;
        extGenPromptOpts =
            typeof generatorExtension._getExtensions === 'function'
                ? generatorExtension._getExtensions()?.[rootGeneratorName]
                : {};
    }
    return extGenPromptOpts;
}
