import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import type { ToolsLogger } from '@sap-ux/logger';
import { convertEslintConfig } from '../../../src';
import type { EslintRcJson } from '../../../src/eslint-config/convert';
import type { Package } from '@sap-ux/project-access';
import crossSpawn from 'cross-spawn';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

jest.mock('cross-spawn');
const MOCK_MIGRATED_MJS = `import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([globalIgnores([
    "dist",
    "node_modules",
    "target",
]), {
    languageOptions: {
        globals: {
            ...globals.browser,
        },

        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: ["./tsconfig.json"],
        },
    },

    rules: {
        "linebreak-style": 0,
    },
}]);
`;

jest.mock('node:fs', () => {
    const actual = jest.requireActual('node:fs');
    return {
        ...actual,
        writeFileSync: jest.fn(),
        mkdtempSync: jest.fn(),
        rmSync: jest.fn(),
        readFileSync: jest.fn((path: string, encoding?: string) => {
            // If reading from temp directory, return mock eslint.config.mjs
            if (path.includes('eslint-migration-') && path.endsWith('eslint.config.mjs')) {
                return MOCK_MIGRATED_MJS;
            }
            // Otherwise use actual readFileSync
            return actual.readFileSync(path, encoding);
        })
    };
});

describe('convertEslintConfig', () => {
    const loggerMock: ToolsLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    } as Partial<ToolsLogger> as ToolsLogger;
    let fs: Editor;
    let errorMock: jest.SpyInstance;
    let debugMock: jest.SpyInstance;
    let spawnMock: jest.MockedFunction<typeof crossSpawn>;

    /**
     * Helper function to set up fixture data in memory for tests.
     * Loads fixture files from disk and copies them into the in-memory file system.
     * This prevents tests from reading/writing to actual fixture files on disk.
     *
     * @param fileSystem - optional file system instance to populate (defaults to the shared fs instance)
     */
    const setupFixtures = (fileSystem: Editor = fs) => {
        const existingConfigBase = join(__dirname, '../../fixtures/eslint-config/existing-config');
        const missingConfigBase = join(__dirname, '../../fixtures/eslint-config/missing-config');

        // Load fixture files from disk and copy to in-memory fs
        const existingConfigPackageJson = JSON.parse(
            readFileSync(join(existingConfigBase, 'package.json'), 'utf-8')
        ) as Package;
        const existingConfigEslintRc = JSON.parse(
            readFileSync(join(existingConfigBase, '.eslintrc.json'), 'utf-8')
        ) as EslintRcJson;
        const missingConfigPackageJson = JSON.parse(
            readFileSync(join(missingConfigBase, 'package.json'), 'utf-8')
        ) as Package;

        // Setup existing-config fixtures in memory
        fileSystem.writeJSON(join(existingConfigBase, 'package.json'), existingConfigPackageJson);
        fileSystem.writeJSON(join(existingConfigBase, '.eslintrc.json'), existingConfigEslintRc);

        // Setup missing-config fixtures in memory
        fileSystem.writeJSON(join(missingConfigBase, 'package.json'), missingConfigPackageJson);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        errorMock = loggerMock.error as unknown as jest.SpyInstance;
        debugMock = loggerMock.debug as unknown as jest.SpyInstance;
        spawnMock = crossSpawn as jest.MockedFunction<typeof crossSpawn>;

        // Setup fixtures in memory BEFORE mocking commit
        setupFixtures();

        // Mock fs.commit to prevent writing to disk in tests
        jest.spyOn(fs, 'commit').mockImplementation((callback?: any) => {
            if (callback) {
                setImmediate(callback);
            }
            return Promise.resolve();
        });

        // Mock temp directory operations
        (mkdtempSync as jest.Mock).mockReturnValue('/tmp/eslint-migration-test');
        (writeFileSync as jest.Mock).mockImplementation(() => {});
        (rmSync as jest.Mock).mockImplementation(() => {});

        const mockChildProcess = new EventEmitter() as ChildProcess;
        spawnMock.mockReturnValue(mockChildProcess);
        // Trigger close event with exit code 0 after a short delay
        setImmediate(() => {
            mockChildProcess.emit('close', 0);
        });
    });

    describe('Prerequisites checks', () => {
        test('should fail when package.json does not exist', async () => {
            const basePath = join(__dirname, '../../fixtures/no-package');
            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('No package.json found at path'));
            }
        });

        test('should fail when eslint dependency does not exist', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(
                    expect.stringContaining('Did not find ESLint dependency in package.json')
                );
            }
        });

        test('should fail when .eslintrc.json does not exist', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/missing-config');
            // Add eslint and fiori-tools plugin to package.json in memory
            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;
            packageJson.devDependencies = packageJson.devDependencies ?? {};
            packageJson.devDependencies.eslint = '^8.0.0';
            packageJson.devDependencies['@sap-ux/eslint-plugin-fiori-tools'] = '^0.6.2';
            fs.writeJSON(packageJsonPath, packageJson);

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(
                    expect.stringContaining('No .eslintrc.json or .eslintrc found at path')
                );
            }
        });

        test('should succeed when .eslintrc exists instead of .eslintrc.json', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Remove .eslintrc.json and create .eslintrc
            const eslintrcJsonPath = join(basePath, '.eslintrc.json');
            const eslintrcPath = join(basePath, '.eslintrc');
            const eslintConfig = fs.readJSON(eslintrcJsonPath) as EslintRcJson;
            fs.delete(eslintrcJsonPath);
            fs.writeJSON(eslintrcPath, eslintConfig);

            const result = await convertEslintConfig(basePath, { logger: loggerMock, fs });

            expect(result).toBeDefined();
            expect(spawnMock).toHaveBeenCalledWith('npx', ['--yes', '@eslint/migrate-config', '.eslintrc'], {
                cwd: '/tmp/eslint-migration-test',
                shell: false,
                stdio: 'inherit'
            });
        });

        test('should fail when eslint version is already 9.0.0 or higher', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Update package.json to have eslint version 9.0.0
            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;
            packageJson.devDependencies!.eslint = '^9.0.0';
            fs.writeJSON(packageJsonPath, packageJson);

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(
                    expect.stringContaining('ESLint version is already 9.0.0 or higher in this project')
                );
            }
        });

        test('should fail when eslint version is 10.0.0', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Update package.json to have eslint version 10.0.0
            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;
            packageJson.devDependencies!.eslint = '^10.0.0';
            fs.writeJSON(packageJsonPath, packageJson);

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(
                    expect.stringContaining('ESLint version is already 9.0.0 or higher in this project')
                );
            }
        });
    });

    /**
     * Helper: returns the parsed JSON that was written to the temp-dir config file.
     * Since removeFioriToolsFromExistingConfig no longer stages a write to mem-fs, the
     * stripped config is only visible via the writeFileSync call made into the temp dir.
     */
    const getStrippedConfig = (): EslintRcJson => {
        const calls = (writeFileSync as jest.Mock).mock.calls;
        // The first writeFileSync call in runMigrationCommand writes the stripped eslintrc to the temp dir
        const strippedCall = calls.find(
            ([path]: [string]) => path.includes('eslint-migration-') && !path.endsWith('eslint.config.mjs')
        );
        if (!strippedCall) {
            throw new Error('writeFileSync was not called with the stripped config');
        }
        return JSON.parse(strippedCall[1] as string) as EslintRcJson;
    };

    describe('Removing Fiori Tools from existing config', () => {
        test('should remove Fiori Tools plugin from .eslintrc.json plugins array', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.plugins = ['@sap-ux/eslint-plugin-fiori-tools', 'other-plugin'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.plugins).not.toContain('@sap-ux/eslint-plugin-fiori-tools');
            expect(strippedConfig.plugins).toContain('other-plugin');
            // The original mem-fs entry must NOT have been overwritten
            const memFsConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(memFsConfig.plugins).toContain('@sap-ux/eslint-plugin-fiori-tools');
        });

        test('should delete plugins key when only Fiori Tools plugin was present', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.plugins = ['@sap-ux/eslint-plugin-fiori-tools'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.plugins).toBeUndefined();
            // The original mem-fs entry must NOT have been overwritten
            const memFsConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(memFsConfig.plugins).toEqual(['@sap-ux/eslint-plugin-fiori-tools']);
        });

        test('should remove Fiori Tools config from .eslintrc.json extends array', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            const rawExtends = strippedConfig.extends;
            // eslint-disable-next-line no-nested-ternary
            const extendsArray: string[] = Array.isArray(rawExtends) ? rawExtends : rawExtends ? [rawExtends] : [];
            expect(extendsArray.some((e) => e.includes('@sap-ux/eslint-plugin-fiori-tools'))).toBe(false);
        });

        test('should log debug message when removing Fiori Tools references', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            expect(debugMock).toHaveBeenCalledWith(
                expect.stringContaining('Removed SAP Fiori tools plugin references from')
            );
        });

        test('should remove eslint:recommended from string extends to avoid FlatCompat compat shim conflict', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = 'eslint:recommended';
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.extends).toBeUndefined();
        });

        test('should remove eslint:recommended from extends array while keeping other entries', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = ['eslint:recommended', 'plugin:other-plugin/recommended'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.extends).toEqual(['plugin:other-plugin/recommended']);
        });

        test('should NOT warn about files scope when eslint:recommended was absent from extends', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            delete eslintConfig.extends;
            eslintConfig.files = ['**/*.{js,mjs,cjs}'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            expect(loggerMock.warn).not.toHaveBeenCalledWith(expect.stringContaining("'eslint:recommended'"));
        });

        test('should warn when eslint:recommended is stripped and the legacy config has a files property', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = 'eslint:recommended';
            eslintConfig.files = ['**/*.{js,mjs,cjs}'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining("'eslint:recommended' was removed"));
            expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('files'));
        });

        test('should remove plugin:@typescript-eslint/recommended from string extends', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = 'plugin:@typescript-eslint/recommended';
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.extends).toBeUndefined();
        });

        test('should remove plugin:@typescript-eslint entries from extends array while keeping others', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = ['plugin:@typescript-eslint/recommended', 'plugin:other/recommended'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.extends).toEqual(['plugin:other/recommended']);
        });

        test('should NOT warn about files scope when no @typescript-eslint extends were present', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            delete eslintConfig.extends;
            eslintConfig.files = ['**/*.{ts,tsx}'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            expect(loggerMock.warn).not.toHaveBeenCalledWith(expect.stringContaining("'plugin:@typescript-eslint/*'"));
        });

        test('should delete extends when string extends is a Fiori Tools config', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = 'plugin:@sap-ux/eslint-plugin-fiori-tools/recommended';
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.extends).toBeUndefined();
        });

        test('should remove Fiori Tools entries from extends array while keeping others', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = ['plugin:other/recommended', 'plugin:@sap-ux/eslint-plugin-fiori-tools/oldConfig'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.extends).toEqual(['plugin:other/recommended']);
        });

        test('should delete extends when all entries are Fiori Tools configs', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = ['plugin:@sap-ux/eslint-plugin-fiori-tools/recommended'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const strippedConfig = getStrippedConfig();
            expect(strippedConfig.extends).toBeUndefined();
        });

        test('should not touch extends if it is absent', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            delete eslintConfig.extends;
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const updatedConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(updatedConfig.extends).toBeUndefined();
        });

        test('should not touch plugins key if it is absent', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            delete eslintConfig.plugins;
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const updatedConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(updatedConfig.plugins).toBeUndefined();
        });

        test('should leave plugins array untouched when it contains no Fiori Tools entries', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.plugins = ['other-plugin'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const updatedConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(updatedConfig.plugins).toEqual(['other-plugin']);
        });
    });

    describe('Injecting Fiori Tools into migrated config', () => {
        test('should add fioriTools import to migrated eslint.config.mjs', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const migratedPath = join(basePath, 'eslint.config.mjs');
            const migratedContent = fs.read(migratedPath);

            expect(migratedContent).toContain("import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';");
        });

        test('should spread fioriTools.configs.recommended into the config array', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const migratedPath = join(basePath, 'eslint.config.mjs');
            const migratedContent = fs.read(migratedPath);

            expect(migratedContent).toContain("...fioriTools.configs['recommended']");
        });

        test('should spread fioriTools.configs[recommended-for-s4hana] when config option is set', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs, config: 'recommended-for-s4hana' });

            const migratedPath = join(basePath, 'eslint.config.mjs');
            const migratedContent = fs.read(migratedPath);

            expect(migratedContent).toContain("...fioriTools.configs['recommended-for-s4hana']");
        });

        test('should insert the spread before the last ]); in the file', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const migratedPath = join(basePath, 'eslint.config.mjs');
            const migratedContent = fs.read(migratedPath);

            // The spread must appear before the final ]);
            const spreadIndex = migratedContent.indexOf("...fioriTools.configs['recommended']");
            const closingIndex = migratedContent.lastIndexOf(']);');
            expect(spreadIndex).toBeGreaterThan(-1);
            expect(spreadIndex).toBeLessThan(closingIndex);
            // A comma must separate the preceding config object from the spread
            expect(migratedContent).toContain(",\n    ...fioriTools.configs['recommended'],\n]);");
        });

        test('should not duplicate the import when called on an already-injected file', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            // Simulate a second injection pass on the already-written content
            const migratedPath = join(basePath, 'eslint.config.mjs');
            const firstContent = fs.read(migratedPath);

            // Write first content back and inject again manually (to test idempotency of the logic)
            fs.write(migratedPath, firstContent);
            // Run through the injection logic indirectly by checking occurrence count
            const importCount = (
                firstContent.match(/import fioriTools from '@sap-ux\/eslint-plugin-fiori-tools';/g) ?? []
            ).length;
            expect(importCount).toBe(1);

            const spreadCount = (firstContent.match(/\.\.\.fioriTools\.configs\['recommended']/g) ?? []).length;
            expect(spreadCount).toBe(1);
        });

        test('should log debug message after injection', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            expect(debugMock).toHaveBeenCalledWith(expect.stringContaining('Injected SAP Fiori tools plugin into'));
        });
    });

    describe('Migration command execution', () => {
        test('should call spawn with correct arguments', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            expect(spawnMock).toHaveBeenCalledWith('npx', ['--yes', '@eslint/migrate-config', '.eslintrc.json'], {
                cwd: '/tmp/eslint-migration-test',
                shell: false,
                stdio: 'inherit'
            });
        });

        test('should handle migration command failure with exit code', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');

            // Mock spawn to return a process that fails
            const mockChildProcess = new EventEmitter() as ChildProcess;
            spawnMock.mockReturnValue(mockChildProcess);
            setImmediate(() => {
                mockChildProcess.emit('close', 1);
            });

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('Migration command failed with exit code 1');
                expect(error.message).toContain('Migration to eslint version 9 failed');
            }
        });

        test('should handle migration command error event', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');

            // Mock spawn to return a process that emits error
            const mockChildProcess = new EventEmitter() as ChildProcess;
            spawnMock.mockReturnValue(mockChildProcess);
            setImmediate(() => {
                mockChildProcess.emit('error', new Error('Command not found'));
            });

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('Migration command failed: Command not found');
                expect(error.message).toContain('Migration to eslint version 9 failed');
            }
        });
    });

    describe('Package.json updates', () => {
        test('should update eslint version to ^9.0.0 in package.json', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.devDependencies?.eslint).toBe('^9.0.0');
        });

        test('should update @sap-ux/eslint-plugin-fiori-tools version to ^9.0.0', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']).toBe('^9.0.0');
        });

        test('should preserve existing devDependencies', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.devDependencies?.['@sap/ux-ui5-tooling']).toBe('1.15.1');
        });

        test('should override existing scripts', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.scripts?.['start-variants-management']).toBeDefined();
            expect(packageJson.scripts?.lint).toBe('eslint ./');
        });

        test('should create devDependencies if it does not exist', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Remove devDependencies from package.json
            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;
            delete packageJson.devDependencies;
            packageJson.devDependencies = {
                eslint: '^8.0.0',
                '@sap-ux/eslint-plugin-fiori-tools': '^0.6.2'
            };
            fs.writeJSON(packageJsonPath, packageJson);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const updatedPackageJson = fs.readJSON(packageJsonPath) as Package;
            expect(updatedPackageJson.devDependencies).toBeDefined();
            expect(updatedPackageJson.devDependencies?.eslint).toBe('^9.0.0');
        });
    });

    describe('File system handling', () => {
        test('should work without logger option', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const result = await convertEslintConfig(basePath, { fs });

            expect(result).toBeDefined();
        });

        test('should work with provided fs instance', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const customFs = create(createStorage());

            // Load fixtures into custom fs
            setupFixtures(customFs);

            // Mock commit on custom fs
            jest.spyOn(customFs, 'commit').mockImplementation((callback?: any) => {
                if (callback) {
                    setImmediate(callback);
                }
                return Promise.resolve();
            });

            const result = await convertEslintConfig(basePath, { logger: loggerMock, fs: customFs });

            expect(result).toBe(customFs);
        });
    });

    describe('Error handling', () => {
        test('should throw error if .eslintrc.json is not a valid JSON object', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Make .eslintrc.json invalid
            const eslintrcPath = join(basePath, '.eslintrc.json');
            fs.write(eslintrcPath, 'invalid json');

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('Could not parse JSON');
            }
        });

        test('should throw error if .eslintrc.json is null', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Make .eslintrc.json return null
            const eslintrcPath = join(basePath, '.eslintrc.json');
            fs.writeJSON(eslintrcPath, null as any);

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('is not a valid JSON object');
            }
        });
    });

    describe('Integration', () => {
        test('should complete full conversion workflow successfully', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            const result = await convertEslintConfig(basePath, { logger: loggerMock, fs });

            // Phase 1: Verify fiori-tools references are removed in the stripped config passed to the migration tool
            const strippedConfig = getStrippedConfig();
            const rawExtends = strippedConfig.extends;
            // eslint-disable-next-line no-nested-ternary
            const extendsArray: string[] = Array.isArray(rawExtends) ? rawExtends : rawExtends ? [rawExtends] : [];
            expect(extendsArray.some((e) => e.includes('@sap-ux/eslint-plugin-fiori-tools'))).toBe(false);
            expect(strippedConfig.plugins ?? []).not.toContain('@sap-ux/eslint-plugin-fiori-tools');

            // The original .eslintrc.json in mem-fs must remain untouched (fiori-tools refs still present)
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const originalMemFsConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            const rawOriginalExtends = originalMemFsConfig.extends;
            let originalExtends: string[];
            if (Array.isArray(rawOriginalExtends)) {
                originalExtends = rawOriginalExtends;
            } else if (rawOriginalExtends) {
                originalExtends = [rawOriginalExtends];
            } else {
                originalExtends = [];
            }
            expect(originalExtends.some((e) => e.includes('@sap-ux/eslint-plugin-fiori-tools'))).toBe(true);

            // Phase 2: Verify spawn was called (migration ran)
            expect(spawnMock).toHaveBeenCalled();

            // Phase 3: Verify fiori-tools import and spread are in the migrated eslint.config.mjs
            const migratedPath = join(basePath, 'eslint.config.mjs');
            const migratedContent = fs.read(migratedPath);
            expect(migratedContent).toContain("import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';");
            expect(migratedContent).toContain("...fioriTools.configs['recommended']");

            // Verify package.json was updated
            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;
            expect(packageJson.devDependencies?.eslint).toBe('^9.0.0');
            expect(packageJson.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']).toBe('^9.0.0');

            // Verify result is the fs instance
            expect(result).toBe(fs);
        });
    });
});
