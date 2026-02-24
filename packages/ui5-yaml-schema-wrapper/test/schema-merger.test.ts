import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import { mergeSchemas } from '../src/schema-merger';

describe('Schema Merger', () => {
    const schemaDir = join(__dirname, '..', 'schema');

    describe('mergeSchemas function', () => {
        test('should execute without errors', () => {
            expect(() => {
                mergeSchemas(schemaDir, false);
            }).not.toThrow();
        });

        test('should generate ux-ui5-tooling-schema.json', () => {
            mergeSchemas(schemaDir, false);
            const schemaPath = join(schemaDir, 'ux-ui5-tooling-schema.json');
            expect(existsSync(schemaPath)).toBe(true);
        });

        test('should produce valid JSON', () => {
            mergeSchemas(schemaDir, false);
            const schemaPath = join(schemaDir, 'ux-ui5-tooling-schema.json');
            const content = readFileSync(schemaPath, 'utf-8');
            expect(() => {
                JSON.parse(content);
            }).not.toThrow();
        });

        test('should run with verbose logging', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mergeSchemas(schemaDir, true);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});

describe('Merged Schema Validation', () => {
    const schemaDir = join(__dirname, '..', 'schema');
    let ajv: Ajv;
    let mergedSchema: any;

    beforeAll(() => {
        ajv = new Ajv({
            allErrors: true,
            strict: false,
            loadSchema: async (uri: string) => {
                // Mock loading the UI5 schema - we only test our additions
                if (uri.includes('ui5.yaml.json')) {
                    return {
                        $schema: 'http://json-schema.org/draft-07/schema#',
                        type: 'object',
                        properties: {
                            specVersion: { type: 'string' },
                            metadata: { type: 'object' },
                            server: { type: 'object' }
                        }
                    };
                }
                throw new Error(`Cannot load schema: ${uri}`);
            }
        });
        addFormats(ajv);

        mergedSchema = JSON.parse(readFileSync(join(schemaDir, 'ux-ui5-tooling-schema.json'), 'utf-8'));
    });

    describe('Schema Structure', () => {
        test('should have valid structure', () => {
            expect(mergedSchema).toHaveProperty('$schema');
            expect(mergedSchema).toHaveProperty('allOf');
            expect(Array.isArray(mergedSchema.allOf)).toBe(true);
            expect(mergedSchema.allOf.length).toBe(2);
        });

        test('should reference UI5 schema', () => {
            const ui5Ref = mergedSchema.allOf[0];
            expect(ui5Ref).toHaveProperty('$ref');
            expect(ui5Ref.$ref).toContain('ui5.yaml.json');
        });

        test('should have definitions', () => {
            const definitions = mergedSchema.allOf[1].definitions;
            expect(definitions).toBeDefined();
            expect(Object.keys(definitions).length).toBeGreaterThan(0);
        });

        test('should have namespaced definitions', () => {
            const definitions = mergedSchema.allOf[1].definitions;
            const definitionKeys = Object.keys(definitions);

            // Check for namespaced definitions
            const hasPreviewMiddleware = definitionKeys.some((key) => key.startsWith('preview_middleware_'));
            const hasBackendProxy = definitionKeys.some((key) => key.startsWith('backend_proxy_middleware_'));
            const hasReloadMiddleware = definitionKeys.some((key) => key.startsWith('reload_middleware_'));

            expect(hasPreviewMiddleware).toBe(true);
            expect(hasBackendProxy).toBe(true);
            expect(hasReloadMiddleware).toBe(true);
        });

        test('should have middleware conditions', () => {
            const middlewareConditions =
                mergedSchema.allOf[1].properties.server.properties.customMiddleware.items.allOf;
            expect(Array.isArray(middlewareConditions)).toBe(true);
            expect(middlewareConditions.length).toBeGreaterThan(0);

            // Each condition should have if/then structure
            middlewareConditions.forEach((condition: any) => {
                expect(condition).toHaveProperty('if');
                expect(condition).toHaveProperty('then');
                expect(condition.if.properties.name).toHaveProperty('const');
                expect(condition.then.properties).toHaveProperty('configuration');
            });
        });
    });

    describe('Middleware Support', () => {
        const supportedMiddlewares = [
            'preview-middleware',
            'fiori-tools-preview',
            'backend-proxy-middleware',
            'backend-proxy-middleware-cf',
            'reload-middleware',
            'fiori-tools-appreload',
            'serve-static-middleware',
            'fiori-tools-servestatic',
            'ui5-proxy-middleware',
            'fiori-tools-proxy'
        ];

        test.each(supportedMiddlewares)('should have configuration for %s', (middlewareName) => {
            const middlewareConditions =
                mergedSchema.allOf[1].properties.server.properties.customMiddleware.items.allOf;
            const condition = middlewareConditions.find((c: any) => c.if.properties.name.const === middlewareName);

            expect(condition).toBeDefined();
            expect(condition.then.properties.configuration).toBeDefined();
        });
    });

    describe('Definition References', () => {
        test('should not have external file references in definitions', () => {
            const schemaString = JSON.stringify(mergedSchema);

            // Should not reference other schema files
            expect(schemaString).not.toContain('backend-proxy-middleware-schema.json');
            expect(schemaString).not.toContain('preview-middleware-schema.json');
            expect(schemaString).not.toContain('ui5-proxy-middleware-schema.json');
        });

        test('should only have internal references', () => {
            const findRefs = (obj: any): string[] => {
                const refs: string[] = [];

                if (obj && typeof obj === 'object') {
                    if (obj.$ref && typeof obj.$ref === 'string') {
                        refs.push(obj.$ref);
                    }

                    for (const key in obj) {
                        if (Array.isArray(obj[key])) {
                            obj[key].forEach((item: any) => refs.push(...findRefs(item)));
                        } else if (typeof obj[key] === 'object') {
                            refs.push(...findRefs(obj[key]));
                        }
                    }
                }

                return refs;
            };

            const allRefs = findRefs(mergedSchema);
            const internalRefs = allRefs.filter((ref) => ref.startsWith('#/'));
            const externalRefs = allRefs.filter((ref) => !ref.startsWith('#/') && !ref.includes('ui5.yaml.json'));

            // All non-UI5 refs should be internal
            expect(externalRefs.length).toBe(0);
            expect(internalRefs.length).toBeGreaterThan(0);
        });
    });

    describe('Sample Configurations', () => {
        test('should validate preview-middleware configuration', () => {
            const definitions = mergedSchema.allOf[1].definitions;
            const middlewareConditions =
                mergedSchema.allOf[1].properties.server.properties.customMiddleware.items.allOf;

            const condition = middlewareConditions.find(
                (c: any) => c.if.properties.name.const === 'preview-middleware'
            );

            expect(condition).toBeDefined();

            const configSchema = {
                ...condition.then.properties.configuration,
                definitions
            };

            const validate = ajv.compile(configSchema);

            const validConfig = {
                flp: {
                    path: '/test/flpSandbox.html',
                    intent: {
                        object: 'myapp',
                        action: 'display'
                    }
                },
                debug: true
            };

            const valid = validate(validConfig);
            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }
            expect(valid).toBe(true);
        });

        test('should validate fiori-tools-proxy configuration', () => {
            const definitions = mergedSchema.allOf[1].definitions;
            const middlewareConditions =
                mergedSchema.allOf[1].properties.server.properties.customMiddleware.items.allOf;

            const condition = middlewareConditions.find((c: any) => c.if.properties.name.const === 'fiori-tools-proxy');

            expect(condition).toBeDefined();

            const configSchema = {
                ...condition.then.properties.configuration,
                definitions
            };

            const validate = ajv.compile(configSchema);

            const validConfig = {
                backend: [
                    {
                        url: 'https://backend.example.com',
                        path: '/sap'
                    }
                ],
                ui5: {
                    path: ['/resources', '/test-resources'],
                    url: 'https://ui5.sap.com'
                },
                ignoreCertErrors: true
            };

            const valid = validate(validConfig);
            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }
            expect(valid).toBe(true);
        });

        test('should validate backend-proxy-middleware-cf configuration', () => {
            const definitions = mergedSchema.allOf[1].definitions;
            const middlewareConditions =
                mergedSchema.allOf[1].properties.server.properties.customMiddleware.items.allOf;

            const condition = middlewareConditions.find(
                (c: any) => c.if.properties.name.const === 'backend-proxy-middleware-cf'
            );

            expect(condition).toBeDefined();

            const configSchema = {
                ...condition.then.properties.configuration,
                definitions
            };

            const validate = ajv.compile(configSchema);

            const validConfig = {
                backends: [
                    {
                        url: 'https://api.example.com',
                        paths: ['/api/v1', '/api/v2']
                    }
                ],
                debug: true
            };

            const valid = validate(validConfig);
            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }
            expect(valid).toBe(true);
        });
    });
});
