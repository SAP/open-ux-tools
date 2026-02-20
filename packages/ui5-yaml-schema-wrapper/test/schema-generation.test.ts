import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Schema Generation', () => {
    const schemaDir = join(__dirname, '..', 'schema');
    const previewMiddlewareSchemaPath = join(schemaDir, 'preview-middleware-schema.json');
    const backendProxySchemaPath = join(schemaDir, 'backend-proxy-middleware-schema.json');
    const backendProxyCfSchemaPath = join(schemaDir, 'backend-proxy-middleware-cf-schema.json');
    const reloadMiddlewareSchemaPath = join(schemaDir, 'reload-middleware-schema.json');
    const serveStaticSchemaPath = join(schemaDir, 'serve-static-middleware-schema.json');
    const ui5ProxySchemaPath = join(schemaDir, 'ui5-proxy-middleware-schema.json');
    const fioriToolsProxySchemaPath = join(schemaDir, 'fiori-tools-proxy-schema.json');
    const wrapperSchemaPath = join(schemaDir, 'ux-ui5-tooling-schema.json');

    describe('Middleware Schema Files', () => {
        test('preview-middleware-schema.json should exist and be valid', () => {
            expect(existsSync(previewMiddlewareSchemaPath)).toBe(true);
            const content = readFileSync(previewMiddlewareSchemaPath, 'utf-8');
            const schema = JSON.parse(content);
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
            expect(schema.properties.flp).toBeDefined();
            expect(schema.properties.test).toBeDefined();
            expect(schema.properties.editors).toBeDefined();
            expect(schema.properties.debug).toBeDefined();
            expect(schema.definitions).toBeDefined();
            expect(schema.definitions.Intent).toBeDefined();
            expect(schema.definitions.TestConfig).toBeDefined();
        });

        test('backend-proxy-middleware-schema.json should exist and be valid', () => {
            expect(existsSync(backendProxySchemaPath)).toBe(true);
            const content = readFileSync(backendProxySchemaPath, 'utf-8');
            const schema = JSON.parse(content);
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
            expect(schema.properties.backend).toBeDefined();
            expect(schema.properties.debug).toBeDefined();
        });

        test('backend-proxy-middleware-cf-schema.json should exist and be valid', () => {
            expect(existsSync(backendProxyCfSchemaPath)).toBe(true);
            const content = readFileSync(backendProxyCfSchemaPath, 'utf-8');
            const schema = JSON.parse(content);
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
            expect(schema.properties.backends).toBeDefined();
            expect(schema.properties.credentials).toBeDefined();
        });

        test('reload-middleware-schema.json should exist and be valid', () => {
            expect(existsSync(reloadMiddlewareSchemaPath)).toBe(true);
            const content = readFileSync(reloadMiddlewareSchemaPath, 'utf-8');
            const schema = JSON.parse(content);
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
            expect(schema.properties.path).toBeDefined();
        });

        test('serve-static-middleware-schema.json should exist and be valid', () => {
            expect(existsSync(serveStaticSchemaPath)).toBe(true);
            const content = readFileSync(serveStaticSchemaPath, 'utf-8');
            const schema = JSON.parse(content);
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
            expect(schema.properties.paths).toBeDefined();
        });

        test('ui5-proxy-middleware-schema.json should exist and be valid', () => {
            expect(existsSync(ui5ProxySchemaPath)).toBe(true);
            const content = readFileSync(ui5ProxySchemaPath, 'utf-8');
            const schema = JSON.parse(content);
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
            expect(schema.properties.ui5).toBeDefined();
        });

        test('fiori-tools-proxy-schema.json should exist and be valid', () => {
            expect(existsSync(fioriToolsProxySchemaPath)).toBe(true);
            const content = readFileSync(fioriToolsProxySchemaPath, 'utf-8');
            const schema = JSON.parse(content);
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
            expect(schema.properties.ui5).toBeDefined();
            expect(schema.properties.backend).toBeDefined();
            expect(schema.properties.proxy).toBeDefined();
            expect(schema.properties.ignoreCertErrors).toBeDefined();
            expect(schema.properties.debug).toBeDefined();
            expect(schema.properties.bsp).toBeDefined();
        });
    });

    describe('Wrapper Schema', () => {
        test('ux-ui5-tooling-schema.json should exist', () => {
            expect(existsSync(wrapperSchemaPath)).toBe(true);
        });

        test('ux-ui5-tooling-schema.json should be valid JSON', () => {
            const content = readFileSync(wrapperSchemaPath, 'utf-8');
            expect(() => JSON.parse(content)).not.toThrow();
        });

        test('ux-ui5-tooling-schema.json should reference the base UI5 schema', () => {
            const content = readFileSync(wrapperSchemaPath, 'utf-8');
            const schema = JSON.parse(content);

            expect(schema.allOf).toBeDefined();
            expect(schema.allOf.length).toBeGreaterThan(0);
            expect(schema.allOf[0].$ref).toContain('ui5.yaml.json');
        });

        test('ux-ui5-tooling-schema.json should support all middleware names', () => {
            const content = readFileSync(wrapperSchemaPath, 'utf-8');
            const wrapperSchema = JSON.parse(content);

            const customMiddleware = wrapperSchema.allOf[1]?.properties?.server?.properties?.customMiddleware;
            expect(customMiddleware).toBeDefined();
            expect(customMiddleware.items.anyOf).toBeDefined();

            // Should have entries for all middleware types
            const middlewareNames = customMiddleware.items.anyOf.map((item: any) => item.if?.properties?.name?.const);

            expect(middlewareNames).toContain('preview-middleware');
            expect(middlewareNames).toContain('fiori-tools-preview');
            expect(middlewareNames).toContain('backend-proxy-middleware');
            expect(middlewareNames).toContain('backend-proxy-middleware-cf');
            expect(middlewareNames).toContain('reload-middleware');
            expect(middlewareNames).toContain('fiori-tools-appreload');
            expect(middlewareNames).toContain('fiori-tools-servestatic');
            expect(middlewareNames).toContain('serve-static-middleware');
            expect(middlewareNames).toContain('ui5-proxy-middleware');
            expect(middlewareNames).toContain('fiori-tools-proxy');

            // Check schema references
            const previewMiddleware = customMiddleware.items.anyOf.find(
                (item: any) => item.if?.properties?.name?.const === 'preview-middleware'
            );
            expect(previewMiddleware.then.properties.configuration.$ref).toBe('preview-middleware-schema.json');

            const backendProxy = customMiddleware.items.anyOf.find(
                (item: any) => item.if?.properties?.name?.const === 'backend-proxy-middleware'
            );
            expect(backendProxy.then.properties.configuration.$ref).toBe('backend-proxy-middleware-schema.json');
        });
    });
});
