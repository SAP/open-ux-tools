import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('YAML Schema Validation', () => {
    const schemaDir = join(__dirname, '..', 'schema');

    let ajv: Ajv;
    let previewMiddlewareSchema: any;
    let backendProxySchema: any;
    let reloadMiddlewareSchema: any;
    let serveStaticSchema: any;

    beforeAll(() => {
        // Setup AJV with middleware schema
        ajv = new Ajv({
            allErrors: true,
            strict: false
        });
        addFormats(ajv);

        // Load all schemas
        previewMiddlewareSchema = JSON.parse(readFileSync(join(schemaDir, 'preview-middleware-schema.json'), 'utf-8'));
        backendProxySchema = JSON.parse(readFileSync(join(schemaDir, 'backend-proxy-middleware-schema.json'), 'utf-8'));
        reloadMiddlewareSchema = JSON.parse(readFileSync(join(schemaDir, 'reload-middleware-schema.json'), 'utf-8'));
        serveStaticSchema = JSON.parse(readFileSync(join(schemaDir, 'serve-static-middleware-schema.json'), 'utf-8'));
        // Note: fiori-tools-proxy-schema has external references that are resolved in the merged schema
    });

    describe('Preview Middleware Schema Validation', () => {
        test('should validate preview middleware with complete configuration', () => {
            const config = {
                flp: {
                    path: '/test/flpSandbox.html',
                    intent: {
                        object: 'myapp',
                        action: 'display'
                    },
                    theme: 'sap_horizon',
                    libs: true,
                    apps: [
                        {
                            target: '/path/to/app',
                            local: './local-app',
                            componentId: 'my.component.id',
                            intent: {
                                object: 'otherapp',
                                action: 'show'
                            }
                        }
                    ],
                    init: '/custom/init.js',
                    enhancedHomePage: true
                },
                test: [
                    {
                        framework: 'OPA5',
                        path: '/test/integration/opaTests.qunit.html',
                        init: '/test/integration/opaTests.qunit.js',
                        pattern: '/test/**/*Journey.{js,ts}'
                    },
                    {
                        framework: 'QUnit',
                        path: '/test/unit/unitTests.qunit.html',
                        init: '/test/unit/unitTests.qunit.js',
                        pattern: '/test/**/*Test.{js,ts}'
                    }
                ],
                editors: {
                    rta: {
                        layer: 'CUSTOMER_BASE',
                        options: {
                            baseId: 'my-base-id',
                            projectId: 'my-project-id',
                            scenario: 'scenario1',
                            appName: 'MyApp'
                        },
                        endpoints: [
                            {
                                path: '/preview.html',
                                developerMode: false,
                                pluginScript: '/plugins/my-plugin.js',
                                generator: 'my-generator'
                            }
                        ]
                    },
                    cardGenerator: {
                        path: '/card-generator'
                    }
                },
                debug: true
            };

            const validate = ajv.compile(previewMiddlewareSchema);
            const valid = validate(config);

            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }

            expect(valid).toBe(true);
        });

        test('should validate preview middleware with minimal flp configuration', () => {
            const config = {
                flp: {
                    path: '/test/flp.html',
                    intent: {
                        object: 'testapp',
                        action: 'preview'
                    }
                },
                debug: false
            };

            const validate = ajv.compile(previewMiddlewareSchema);
            const valid = validate(config);

            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }

            expect(valid).toBe(true);
        });

        test('should reject preview middleware with invalid framework value', () => {
            const config = {
                flp: {
                    path: '/test/flpSandbox.html',
                    intent: {
                        object: 'myapp',
                        action: 'display'
                    }
                },
                test: [
                    {
                        framework: 'InvalidFramework',
                        path: '/test/test.html'
                    }
                ]
            };

            const validate = ajv.compile(previewMiddlewareSchema);
            const valid = validate(config);

            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();

            // Should have enum error for framework
            const frameworkError = validate.errors!.find(
                (err: any) => err.instancePath.includes('/test/0/framework') || err.params?.allowedValues
            );
            expect(frameworkError).toBeDefined();
        });

        test('should reject preview middleware with additional properties', () => {
            const config = {
                flp: {
                    path: '/test/flpSandbox.html',
                    intent: {
                        object: 'myapp',
                        action: 'display'
                    },
                    invalidProperty: 'This should cause a validation error'
                },
                unknownProperty: 'This is not a valid MiddlewareConfig property'
            };

            const validate = ajv.compile(previewMiddlewareSchema);
            const valid = validate(config);

            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();

            // Should have additional properties violations
            const additionalPropsError = validate.errors!.find((err: any) => err.keyword === 'additionalProperties');
            expect(additionalPropsError).toBeDefined();
        });

        test('should reject preview middleware with invalid properties in editors object', () => {
            const config = {
                editors: {
                    xyz: {
                        url: 'hello/world.html'
                    },
                    rta: {
                        endpoints: [
                            {
                                path: 'localService/variantsManagement.html'
                            }
                        ]
                    }
                },
                debug: false
            };

            const validate = ajv.compile(previewMiddlewareSchema);
            const valid = validate(config);

            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();

            // Should have additional properties error for 'xyz'
            const additionalPropsError = validate.errors!.find(
                (err: any) => err.keyword === 'additionalProperties' && err.params?.additionalProperty === 'xyz'
            );
            expect(additionalPropsError).toBeDefined();
        });
    });

    describe('Backend Proxy Middleware Schema Validation', () => {
        test('should validate backend proxy configuration with url and path', () => {
            const config = {
                backend: {
                    url: 'https://backend.example.com',
                    path: '/api'
                },
                debug: true
            };

            const validate = ajv.compile(backendProxySchema);
            const valid = validate(config);

            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }

            expect(valid).toBe(true);
        });

        test('should validate backend proxy configuration with destination', () => {
            const config = {
                backend: {
                    destination: 'MyDestination',
                    path: '/odata',
                    pathReplace: '/services/odata'
                }
            };

            const validate = ajv.compile(backendProxySchema);
            const valid = validate(config);

            expect(valid).toBe(true);
        });

        test('should reject backend proxy configuration with invalid properties', () => {
            const config = {
                backend: {
                    url: 'https://backend.example.com',
                    path: '/api',
                    invalidProperty: 'should fail'
                },
                unknownConfig: true
            };

            const validate = ajv.compile(backendProxySchema);
            const valid = validate(config);

            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });
    });

    describe('Reload Middleware Schema Validation', () => {
        test('should validate reload middleware with valid port number', () => {
            const config = {
                port: 35729,
                path: 'webapp',
                exts: ['xml', 'json', 'properties'],
                debug: true
            };

            const validate = ajv.compile(reloadMiddlewareSchema);
            const valid = validate(config);

            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }

            expect(valid).toBe(true);
        });

        test('should reject reload middleware with invalid port type', () => {
            const config = {
                port: 'not-a-number',
                path: 'webapp'
            };

            const validate = ajv.compile(reloadMiddlewareSchema);
            const valid = validate(config);

            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();

            // Should have type error for port
            const portError = validate.errors!.find(
                (err: any) => err.instancePath === '/port' && err.keyword === 'type'
            );
            expect(portError).toBeDefined();
        });

        test('should reject reload middleware with additional properties', () => {
            const config = {
                port: 35729,
                unknownConfig: true
            };

            const validate = ajv.compile(reloadMiddlewareSchema);
            const valid = validate(config);

            expect(valid).toBe(false);
        });
    });

    describe('Serve Static Middleware Schema Validation', () => {
        test('should validate serve static configuration with paths array', () => {
            const config = {
                paths: [
                    {
                        path: '/resources',
                        src: './node_modules/@sap/ux-ui5-tooling/resources'
                    },
                    {
                        path: '/test-resources',
                        src: './test'
                    }
                ]
            };

            const validate = ajv.compile(serveStaticSchema);
            const valid = validate(config);

            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }

            expect(valid).toBe(true);
        });

        test('should allow serve static configuration with path only (src is optional)', () => {
            const config = {
                paths: [
                    {
                        path: '/resources'
                    }
                ]
            };

            const validate = ajv.compile(serveStaticSchema);
            const valid = validate(config);

            if (!valid) {
                console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
            }

            expect(valid).toBe(true);
        });

        test('should reject serve static configuration with additional invalid properties', () => {
            const config = {
                paths: [
                    {
                        path: '/resources',
                        src: './test',
                        invalidProperty: 'should fail'
                    }
                ]
            };

            const validate = ajv.compile(serveStaticSchema);
            const valid = validate(config);

            expect(valid).toBe(false);
        });
    });
});
