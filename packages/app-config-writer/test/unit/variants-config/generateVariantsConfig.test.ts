import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

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

const { generateVariantsConfig } = await import('../../../src');
const { ToolsLogger } = await import('@sap-ux/logger');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    test('add variants configuration to a project with deprecated preview middleware config', async () => {
        const deprecatedConfig = join(basePath, 'deprecated-config');
        const fs = await generateVariantsConfig(deprecatedConfig);
        expect(fs.readJSON(join(deprecatedConfig, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(deprecatedConfig, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('adding variants configuration to a non existing project', async () => {
        const basePath = join(__dirname, '../../fixtures/a-folder-that-does-not-exist');
        await expect(generateVariantsConfig(basePath, 'hugo.yaml', new ToolsLogger())).rejects.toThrow(
            `File 'hugo.yaml' not found in project '${basePath}'`
        );
    });
});
