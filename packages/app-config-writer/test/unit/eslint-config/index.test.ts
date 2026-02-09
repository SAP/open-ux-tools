import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import type { ToolsLogger } from '@sap-ux/logger';
import { generateEslintConfig } from '../../../src/eslint-config/index';
import type { Package } from '@sap-ux/project-access';

describe('generateEslintConfig', () => {
    const loggerMock: ToolsLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    } as Partial<ToolsLogger> as ToolsLogger;
    let fs: Editor;
    let errorMock: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        errorMock = loggerMock.error as any;
    });

    describe('Prerequisites checks', () => {
        test('should fail when package.json does not exist', async () => {
            const basePath = join(__dirname, '../../fixtures/no-package');
            try {
                await generateEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('No package.json found at path'));
            }
        });

        test('should fail when eslint already exists in devDependencies', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            try {
                await generateEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(
                    expect.stringContaining('ESLint already exists in this project')
                );
            }
        });

        test('should succeed when prerequisites are met', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            const result = await generateEslintConfig(basePath, { logger: loggerMock, fs });
            expect(result).toBeDefined();
            expect(errorMock).not.toHaveBeenCalled();
        });
    });

    describe('Package.json updates', () => {
        test('should add eslint and @sap-ux/eslint-plugin-fiori-tools devDependencies to package.json', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            await generateEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.devDependencies).toBeDefined();
            expect(packageJson.devDependencies?.eslint).toBe('^9.0.0');
            expect(packageJson.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']).toBe('^9.0.0');
        });

        test('should add lint script to package.json', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            await generateEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.scripts).toBeDefined();
            expect(packageJson.scripts?.lint).toBe('eslint .');
        });

        test('should preserve existing devDependencies', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            await generateEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.devDependencies?.['@sap/ux-ui5-tooling']).toBe('1.15.1');
        });

        test('should preserve existing scripts', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            await generateEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.scripts?.['start-variants-management']).toBeDefined();
        });
    });

    describe('ESLint config file generation', () => {
        test('should create eslint.config.mjs file', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            await generateEslintConfig(basePath, { logger: loggerMock, fs });

            const eslintConfigPath = join(basePath, 'eslint.config.mjs');
            const eslintConfigContent = fs.read(eslintConfigPath);

            expect(eslintConfigContent).toBeDefined();
            expect(eslintConfigContent).toContain('@sap-ux/eslint-plugin-fiori-tools');
            expect(eslintConfigContent).toContain('fioriTools.configs.recommended');
        });

        test('should generate valid eslint config content', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            await generateEslintConfig(basePath, { logger: loggerMock, fs });

            const eslintConfigPath = join(basePath, 'eslint.config.mjs');
            const eslintConfigContent = fs.read(eslintConfigPath);

            expect(eslintConfigContent).toMatchSnapshot();
        });

        test('should use recommended-for-s4hana config when specified', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            await generateEslintConfig(basePath, { logger: loggerMock, fs, config: 'recommended-for-s4hana' });

            const eslintConfigPath = join(basePath, 'eslint.config.mjs');
            const eslintConfigContent = fs.read(eslintConfigPath);

            expect(eslintConfigContent).toContain("fioriTools.configs['recommended-for-s4hana']");
            expect(eslintConfigContent).not.toContain('fioriTools.configs.recommended');
        });
    });

    describe('File system handling', () => {
        test('should work without fs option (creates new fs)', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            const result = await generateEslintConfig(basePath, { logger: loggerMock });

            expect(result).toBeDefined();
            expect(result.readJSON).toBeDefined();
        });

        test('should work without logger option', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            const result = await generateEslintConfig(basePath, { fs });

            expect(result).toBeDefined();
        });

        test('should work with provided fs instance', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            const customFs = create(createStorage());
            const result = await generateEslintConfig(basePath, { logger: loggerMock, fs: customFs });

            expect(result).toBe(customFs);
        });
    });
});
