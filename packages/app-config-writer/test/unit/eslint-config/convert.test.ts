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
                return 'export default [];\n';
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

        test('should fail when eslint-plugin-fiori-custom dependency exists', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Add eslint-plugin-fiori-custom to package.json in memory
            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;
            packageJson.devDependencies!['eslint-plugin-fiori-custom'] = '^1.0.0';
            fs.writeJSON(packageJsonPath, packageJson);

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(
                    expect.stringContaining('Found eslint-plugin-fiori-custom dependency')
                );
                expect(errorMock).toHaveBeenCalledWith(
                    expect.stringContaining('This plugin is not compatible with ESLint version 9')
                );
            }
        });

        test('should fail when @sap-ux/eslint-plugin-fiori-tools dependency does not exist', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Remove @sap-ux/eslint-plugin-fiori-tools from package.json in memory
            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;
            delete packageJson.devDependencies!['@sap-ux/eslint-plugin-fiori-tools'];
            fs.writeJSON(packageJsonPath, packageJson);

            try {
                await convertEslintConfig(basePath, { logger: loggerMock, fs });
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toContain('The prerequisites are not met');
                expect(errorMock).toHaveBeenCalledWith(
                    expect.stringContaining('No @sap-ux/eslint-plugin-fiori-tools dependency found')
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

    describe('Adding Fiori Tools to existing config', () => {
        test('should add Fiori Tools plugin to .eslintrc.json plugins array', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;

            expect(eslintConfig.plugins).toBeDefined();
            expect(eslintConfig.plugins).toContain('@sap-ux/eslint-plugin-fiori-tools');
        });

        test('should add Fiori Tools config to .eslintrc.json extends array', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;

            expect(eslintConfig.extends).toBeDefined();
            expect(Array.isArray(eslintConfig.extends) ? eslintConfig.extends : [eslintConfig.extends]).toContain(
                'plugin:@sap-ux/eslint-plugin-fiori-tools/recommended'
            );
        });

        test('should use custom config name when specified', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs, config: 'recommended-for-s4hana' });

            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;

            expect(Array.isArray(eslintConfig.extends) ? eslintConfig.extends : [eslintConfig.extends]).toContain(
                'plugin:@sap-ux/eslint-plugin-fiori-tools/recommended-for-s4hana'
            );
        });

        test('should log info message when adding Fiori Tools plugin', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            expect(debugMock).toHaveBeenCalledWith(expect.stringContaining('Applied SAP Fiori tools settings'));
        });

        test('should handle .eslintrc.json with string extends', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Modify .eslintrc.json to have string extends
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = 'eslint:recommended';
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const updatedConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(Array.isArray(updatedConfig.extends)).toBe(true);
            expect(updatedConfig.extends).toContain('eslint:recommended');
            expect(updatedConfig.extends).toContain('plugin:@sap-ux/eslint-plugin-fiori-tools/recommended');
        });

        test('should replace existing Fiori Tools config in extends array', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Modify .eslintrc.json to have old Fiori Tools config
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.extends = ['eslint:recommended', 'plugin:@sap-ux/eslint-plugin-fiori-tools/oldConfig'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs, config: 'recommended' });

            const updatedConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(updatedConfig.extends).toEqual([
                'eslint:recommended',
                'plugin:@sap-ux/eslint-plugin-fiori-tools/recommended'
            ]);
        });

        test('should create plugins array if it does not exist', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Remove plugins from .eslintrc.json
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            delete eslintConfig.plugins;
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const updatedConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(updatedConfig.plugins).toBeDefined();
            expect(Array.isArray(updatedConfig.plugins)).toBe(true);
        });

        test('should create extends array if it does not exist', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Remove extends from .eslintrc.json
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            delete eslintConfig.extends;
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const updatedConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(updatedConfig.extends).toBeDefined();
            expect(Array.isArray(updatedConfig.extends)).toBe(true);
        });

        test('should not duplicate Fiori Tools plugin if already present', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            // Add Fiori Tools plugin to .eslintrc.json
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            eslintConfig.plugins = ['@sap-ux/eslint-plugin-fiori-tools', 'other-plugin'];
            fs.writeJSON(eslintrcPath, eslintConfig);

            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const updatedConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            const fioriToolsCount = updatedConfig?.plugins?.filter(
                (plugin: string) => plugin === '@sap-ux/eslint-plugin-fiori-tools'
            )?.length;
            expect(fioriToolsCount).toBe(1);
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

        test('should preserve existing scripts', async () => {
            const basePath = join(__dirname, '../../fixtures/eslint-config/existing-config');
            await convertEslintConfig(basePath, { logger: loggerMock, fs });

            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;

            expect(packageJson.scripts?.['start-variants-management']).toBeDefined();
            expect(packageJson.scripts?.lint).toBe('eslint . --ext .js,.ts');
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

            // Verify .eslintrc.json was updated
            const eslintrcPath = join(basePath, '.eslintrc.json');
            const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson;
            expect(eslintConfig.plugins).toContain('@sap-ux/eslint-plugin-fiori-tools');
            expect(Array.isArray(eslintConfig.extends) ? eslintConfig.extends : [eslintConfig.extends]).toContain(
                'plugin:@sap-ux/eslint-plugin-fiori-tools/recommended'
            );

            // Verify package.json was updated
            const packageJsonPath = join(basePath, 'package.json');
            const packageJson = fs.readJSON(packageJsonPath) as Package;
            expect(packageJson.devDependencies?.eslint).toBe('^9.0.0');
            expect(packageJson.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']).toBe('^9.0.0');

            // Verify spawn was called
            expect(spawnMock).toHaveBeenCalled();

            // Verify result is the fs instance
            expect(result).toBe(fs);
        });
    });
});
