import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Schema Generation', () => {
    const schemaDir = join(__dirname, '..', 'schema');
    const middlewareSchemaPath = join(schemaDir, 'middleware-config-schema.json');
    const wrapperSchemaPath = join(schemaDir, 'ux-ui5-tooling-schema.json');

    test('middleware-config-schema.json should exist', () => {
        expect(existsSync(middlewareSchemaPath)).toBe(true);
    });

    test('ux-ui5-tooling-schema.json should exist', () => {
        expect(existsSync(wrapperSchemaPath)).toBe(true);
    });

    test('middleware-config-schema.json should be valid JSON', () => {
        const content = readFileSync(middlewareSchemaPath, 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
    });

    test('middleware-config-schema.json should contain MiddlewareConfig properties', () => {
        const content = readFileSync(middlewareSchemaPath, 'utf-8');
        const schema = JSON.parse(content);

        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(schema.properties.flp).toBeDefined();
        expect(schema.properties.test).toBeDefined();
        expect(schema.properties.editors).toBeDefined();
        expect(schema.properties.debug).toBeDefined();
    });

    test('middleware-config-schema.json should have definitions', () => {
        const content = readFileSync(middlewareSchemaPath, 'utf-8');
        const schema = JSON.parse(content);

        expect(schema.definitions).toBeDefined();
        expect(schema.definitions.Intent).toBeDefined();
        expect(schema.definitions.TestConfig).toBeDefined();
        expect(schema.definitions['Partial<FlpConfig>']).toBeDefined();
        expect(schema.definitions.RtaConfig).toBeDefined();
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

    test('ux-ui5-tooling-schema.json should support both middleware names', () => {
        const content = readFileSync(wrapperSchemaPath, 'utf-8');
        const wrapperSchema = JSON.parse(content);

        // Navigate to the customMiddleware items
        const customMiddleware = wrapperSchema.allOf[1]?.properties?.server?.properties?.customMiddleware;
        expect(customMiddleware).toBeDefined();
        expect(customMiddleware.items.anyOf).toBeDefined();
        expect(customMiddleware.items.anyOf.length).toBe(2);

        // Check for preview-middleware
        const previewMiddleware = customMiddleware.items.anyOf.find(
            (item: any) => item.if?.properties?.name?.const === 'preview-middleware'
        );
        expect(previewMiddleware).toBeDefined();
        expect(previewMiddleware.then.properties.configuration.$ref).toBe('middleware-config-schema.json');

        // Check for fiori-tools-preview
        const fioriToolsPreview = customMiddleware.items.anyOf.find(
            (item: any) => item.if?.properties?.name?.const === 'fiori-tools-preview'
        );
        expect(fioriToolsPreview).toBeDefined();
        expect(fioriToolsPreview.then.properties.configuration.$ref).toBe('middleware-config-schema.json');
    });
});
