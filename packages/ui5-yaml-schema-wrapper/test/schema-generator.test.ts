import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
    type MiddlewareSchemaConfig,
    generateSchema,
    generateAllSchemas,
    getMiddlewareConfigs,
    getSchemaOutputDir,
    resolvePackageSrc,
    runCli
} from '../src';

describe('schema-generator', () => {
    describe('resolvePackageSrc', () => {
        it('should resolve package source path for @sap-ux/preview-middleware', () => {
            const result = resolvePackageSrc('@sap-ux/preview-middleware', 'types/index.ts');
            expect(result).toContain('preview-middleware');
            expect(result).toContain('src');
            expect(result).toContain('types');
            expect(result).toContain('index.ts');
        });

        it('should resolve package source path for @sap-ux/backend-proxy-middleware', () => {
            const result = resolvePackageSrc('@sap-ux/backend-proxy-middleware', 'base/types.ts');
            expect(result).toContain('backend-proxy-middleware');
            expect(result).toContain('src');
            expect(result).toContain('base');
            expect(result).toContain('types.ts');
        });

        it('should throw for non-existent package', () => {
            expect(() => resolvePackageSrc('non-existent-package', 'types.ts')).toThrow();
        });
    });

    describe('getSchemaOutputDir', () => {
        it('should return schema directory relative to base dir', () => {
            const result = getSchemaOutputDir('/some/base/dir');
            expect(result).toBe(join('/some/base/dir', 'schema'));
        });

        it('should use process.cwd() as default base dir', () => {
            const result = getSchemaOutputDir();
            expect(result).toBe(join(process.cwd(), 'schema'));
        });
    });

    describe('getMiddlewareConfigs', () => {
        it('should return array of middleware configurations', () => {
            const configs = getMiddlewareConfigs();
            expect(Array.isArray(configs)).toBe(true);
            expect(configs.length).toBeGreaterThan(0);
        });

        it('should include preview-middleware config', () => {
            const configs = getMiddlewareConfigs();
            const previewConfig = configs.find((c) => c.name === 'preview-middleware');
            expect(previewConfig).toBeDefined();
            expect(previewConfig?.typeName).toBe('MiddlewareConfig');
            expect(previewConfig?.outputFileName).toBe('preview-middleware-schema.json');
        });

        it('should include backend-proxy-middleware config', () => {
            const configs = getMiddlewareConfigs();
            const backendConfig = configs.find((c) => c.name === 'backend-proxy-middleware');
            expect(backendConfig).toBeDefined();
            expect(backendConfig?.typeName).toBe('BackendMiddlewareConfig');
            expect(backendConfig?.outputFileName).toBe('backend-proxy-middleware-schema.json');
        });

        it('should include backend-proxy-middleware-cf config', () => {
            const configs = getMiddlewareConfigs();
            const cfConfig = configs.find((c) => c.name === 'backend-proxy-middleware-cf');
            expect(cfConfig).toBeDefined();
            expect(cfConfig?.typeName).toBe('CfOAuthMiddlewareConfig');
        });

        it('should include reload-middleware config', () => {
            const configs = getMiddlewareConfigs();
            const reloadConfig = configs.find((c) => c.name === 'reload-middleware');
            expect(reloadConfig).toBeDefined();
            expect(reloadConfig?.typeName).toBe('ReloaderConfig');
        });

        it('should include serve-static-middleware config', () => {
            const configs = getMiddlewareConfigs();
            const serveStaticConfig = configs.find((c) => c.name === 'serve-static-middleware');
            expect(serveStaticConfig).toBeDefined();
            expect(serveStaticConfig?.typeName).toBe('ServeStaticConfig');
        });

        it('should include ui5-proxy-middleware config', () => {
            const configs = getMiddlewareConfigs();
            const ui5ProxyConfig = configs.find((c) => c.name === 'ui5-proxy-middleware');
            expect(ui5ProxyConfig).toBeDefined();
            expect(ui5ProxyConfig?.typeName).toBe('UI5ProxyConfig');
        });

        it('should have valid types paths for all configs', () => {
            const configs = getMiddlewareConfigs();
            for (const config of configs) {
                expect(existsSync(config.typesPath)).toBe(true);
            }
        });
    });

    describe('generateSchema', () => {
        const testOutputDir = join(__dirname, 'test-output');

        beforeAll(() => {
            if (!existsSync(testOutputDir)) {
                mkdirSync(testOutputDir, { recursive: true });
            }
        });

        afterAll(() => {
            if (existsSync(testOutputDir)) {
                rmSync(testOutputDir, { recursive: true, force: true });
            }
        });

        it('should generate schema for preview-middleware', () => {
            const configs = getMiddlewareConfigs();
            const previewConfig = configs.find((c) => c.name === 'preview-middleware')!;

            const result = generateSchema(previewConfig, testOutputDir, false);

            expect(result.success).toBe(true);
            expect(result.name).toBe('preview-middleware');
            expect(result.outputPath).toBeDefined();
            expect(existsSync(result.outputPath!)).toBe(true);

            const schema = JSON.parse(readFileSync(result.outputPath!, 'utf-8'));
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
        });

        it('should generate schema for backend-proxy-middleware', () => {
            const configs = getMiddlewareConfigs();
            const backendConfig = configs.find((c) => c.name === 'backend-proxy-middleware')!;

            const result = generateSchema(backendConfig, testOutputDir, false);

            expect(result.success).toBe(true);
            expect(result.name).toBe('backend-proxy-middleware');
            expect(existsSync(result.outputPath!)).toBe(true);
        });

        it('should fail for non-existent types path', () => {
            const config: MiddlewareSchemaConfig = {
                name: 'test-middleware',
                typesPath: '/non/existent/path.ts',
                typeName: 'TestType',
                outputFileName: 'test-schema.json'
            };

            const result = generateSchema(config, testOutputDir, false);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Types file not found');
        });

        it('should fail for non-existent type name', () => {
            const configs = getMiddlewareConfigs();
            const previewConfig = configs.find((c) => c.name === 'preview-middleware')!;
            const invalidConfig: MiddlewareSchemaConfig = {
                ...previewConfig,
                name: 'invalid-type-test',
                typeName: 'NonExistentType',
                outputFileName: 'invalid-schema.json'
            };

            const result = generateSchema(invalidConfig, testOutputDir, false);

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should log messages when verbose is true', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const configs = getMiddlewareConfigs();
            const previewConfig = configs.find((c) => c.name === 'preview-middleware')!;

            generateSchema(previewConfig, testOutputDir, true);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Generating schema for preview-middleware')
            );
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Types path:'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Type name:'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SUCCESS:'));

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should log error when types file not found in verbose mode', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const config: MiddlewareSchemaConfig = {
                name: 'test-middleware',
                typesPath: '/non/existent/path.ts',
                typeName: 'TestType',
                outputFileName: 'test-schema.json'
            };

            generateSchema(config, testOutputDir, true);

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR:'));
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Types file not found'));

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should log error when type not found in verbose mode', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const configs = getMiddlewareConfigs();
            const previewConfig = configs.find((c) => c.name === 'preview-middleware')!;
            const invalidConfig: MiddlewareSchemaConfig = {
                ...previewConfig,
                name: 'invalid-type-test',
                typeName: 'NonExistentType',
                outputFileName: 'invalid-schema.json'
            };

            generateSchema(invalidConfig, testOutputDir, true);

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR:'));

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('generateAllSchemas', () => {
        const testOutputDir = join(__dirname, 'test-output-all');

        beforeAll(() => {
            if (!existsSync(testOutputDir)) {
                mkdirSync(testOutputDir, { recursive: true });
            }
        });

        afterAll(() => {
            if (existsSync(testOutputDir)) {
                rmSync(testOutputDir, { recursive: true, force: true });
            }
        });

        it('should generate all schemas successfully', () => {
            const summary = generateAllSchemas(undefined, testOutputDir, false);

            expect(summary.total).toBe(getMiddlewareConfigs().length);
            expect(summary.successCount).toBe(summary.total);
            expect(summary.failCount).toBe(0);
            expect(summary.results).toHaveLength(summary.total);
        });

        it('should return correct summary with mixed results', () => {
            const validConfig = getMiddlewareConfigs()[0];
            const invalidConfig: MiddlewareSchemaConfig = {
                name: 'invalid-middleware',
                typesPath: '/non/existent/path.ts',
                typeName: 'InvalidType',
                outputFileName: 'invalid-schema.json'
            };

            const summary = generateAllSchemas([validConfig, invalidConfig], testOutputDir, false);

            expect(summary.total).toBe(2);
            expect(summary.successCount).toBe(1);
            expect(summary.failCount).toBe(1);
            expect(summary.results).toHaveLength(2);
            expect(summary.results.find((r) => r.success)).toBeDefined();
            expect(summary.results.find((r) => !r.success)).toBeDefined();
        });

        it('should generate schema files in the output directory', () => {
            const configs = getMiddlewareConfigs().slice(0, 2); // Test with first 2 configs

            generateAllSchemas(configs, testOutputDir, false);

            for (const config of configs) {
                const outputPath = join(testOutputDir, config.outputFileName);
                expect(existsSync(outputPath)).toBe(true);

                const schema = JSON.parse(readFileSync(outputPath, 'utf-8'));
                expect(schema.type).toBe('object');
            }
        });

        it('should log messages when verbose is true', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const configs = getMiddlewareConfigs().slice(0, 1); // Use just one config for speed

            generateAllSchemas(configs, testOutputDir, true);

            expect(consoleSpy).toHaveBeenCalledWith('=== Generating Middleware Schemas ===');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Schema output directory:'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('=== Summary ==='));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Success:'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed:'));

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('runCli', () => {
        const testOutputDir = join(__dirname, 'test-output-cli');

        beforeAll(() => {
            if (!existsSync(testOutputDir)) {
                mkdirSync(testOutputDir, { recursive: true });
            }
            // Create schema subdirectory
            const schemaDir = join(testOutputDir, 'schema');
            if (!existsSync(schemaDir)) {
                mkdirSync(schemaDir, { recursive: true });
            }
        });

        afterAll(() => {
            if (existsSync(testOutputDir)) {
                rmSync(testOutputDir, { recursive: true, force: true });
            }
        });

        it('should generate schemas in the specified base directory', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            runCli(testOutputDir);

            expect(consoleSpy).toHaveBeenCalledWith('=== Generating Middleware Schemas ===');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All schemas generated successfully!'));

            // Check that schemas were generated
            const schemaDir = join(testOutputDir, 'schema');
            expect(existsSync(join(schemaDir, 'preview-middleware-schema.json'))).toBe(true);
            expect(existsSync(join(schemaDir, 'backend-proxy-middleware-schema.json'))).toBe(true);

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
    });
});
