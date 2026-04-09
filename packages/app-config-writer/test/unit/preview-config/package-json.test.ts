import { jest } from '@jest/globals';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ToolsLogger } from '@sap-ux/logger';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

jest.unstable_mockModule('chalk', () => ({
    default: chalk,
    cyan: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s
}));

jest.unstable_mockModule('prompts', () => ({
    prompt: jest.fn(),
    inject: jest.fn()
}));

const mockGenerateVariantsConfig = jest.fn();
jest.unstable_mockModule('../../../src/variants-config/generateVariantsConfig', () => ({
    generateVariantsConfig: mockGenerateVariantsConfig
}));

const { ensurePreviewMiddlewareDependency, updateVariantsCreationScript } =
    await import('../../../src/preview-config/package-json');

describe('package-json', () => {
    const logger = new ToolsLogger();
    const basePath = join(__dirname, '../../fixtures/preview-config');
    let fs: Editor;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
    });

    describe('ensurePreviewMiddlewareDependency', () => {
        test('ensure preview middleware dependency', async () => {
            const variousConfigsPath = join(basePath, 'various-configs');
            const packageJson = {
                'name': 'test'
            };
            fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

            ensurePreviewMiddlewareDependency(fs, variousConfigsPath);
            expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
        });

        test('ensure preview middleware dependency w/o package.json', async () => {
            const variousConfigsPath = join(basePath, 'various-configs');

            const variousConfigsPackageJsonPath = join(variousConfigsPath, 'package.json');
            fs.delete(variousConfigsPackageJsonPath);
            ensurePreviewMiddlewareDependency(fs, variousConfigsPath);
            expect(() => fs.read(join(variousConfigsPath, 'package.json'))).toThrow(
                `${variousConfigsPackageJsonPath} doesn\'t exist`
            );
        });
    });

    describe('updateVariantsCreationScript', () => {
        test('update variants creation script - yes', async () => {
            const variousConfigsPath = join(basePath, 'various-configs');
            const packageJson = {
                scripts: {
                    'start-variants-management':
                        'fiori run -o /preview.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml'
                }
            };
            fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

            mockGenerateVariantsConfig.mockResolvedValue(fs);

            await updateVariantsCreationScript(fs, variousConfigsPath, logger);

            expect(mockGenerateVariantsConfig).toHaveBeenCalledTimes(1);
        });

        test('update variants creation script - no', async () => {
            const variousConfigsPath = join(basePath, 'various-configs');
            //the following typo in the script name is intended!
            const packageJson = {
                scripts: {
                    'start-varinats-management':
                        'fiori run -o /preview.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml'
                }
            };
            fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

            mockGenerateVariantsConfig.mockResolvedValue(fs);

            await updateVariantsCreationScript(fs, variousConfigsPath, logger);

            expect(mockGenerateVariantsConfig).not.toHaveBeenCalled();
        });
    });
});
