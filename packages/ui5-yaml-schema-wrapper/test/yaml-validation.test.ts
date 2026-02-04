import { readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('YAML Schema Validation', () => {
    const schemaDir = join(__dirname, '..', 'schema');
    const middlewareSchemaPath = join(schemaDir, 'middleware-config-schema.json');
    const validYamlPath = join(__dirname, 'sample-ui5.yaml');
    const invalidYamlPath = join(__dirname, 'sample-ui5-invalid.yaml');

    let ajv: Ajv;
    let middlewareSchema: any;

    beforeAll(() => {
        // Setup AJV with middleware schema
        ajv = new Ajv({
            allErrors: true,
            strict: false
        });
        addFormats(ajv);

        middlewareSchema = JSON.parse(readFileSync(middlewareSchemaPath, 'utf-8'));
    });

    test('valid ui5.yaml should pass middleware configuration validation', () => {
        const yamlContent = readFileSync(validYamlPath, 'utf-8');
        const parsedYaml: any = load(yamlContent);

        const previewMiddleware = parsedYaml.server.customMiddleware.find(
            (mw: any) => mw.name === 'preview-middleware'
        );

        const validate = ajv.compile(middlewareSchema);
        const valid = validate(previewMiddleware.configuration);

        if (!valid) {
            console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
        }

        expect(valid).toBe(true);
    });

    test('valid ui5.yaml should have correct preview-middleware configuration', () => {
        const yamlContent = readFileSync(validYamlPath, 'utf-8');
        const parsedYaml: any = load(yamlContent);

        const previewMiddleware = parsedYaml.server.customMiddleware.find(
            (mw: any) => mw.name === 'preview-middleware'
        );

        expect(previewMiddleware).toBeDefined();
        expect(previewMiddleware.configuration.flp).toBeDefined();
        expect(previewMiddleware.configuration.flp.intent.object).toBe('myapp');
        expect(previewMiddleware.configuration.test).toHaveLength(2);
        expect(previewMiddleware.configuration.debug).toBe(true);
    });

    test('valid ui5.yaml should have correct fiori-tools-preview configuration', () => {
        const yamlContent = readFileSync(validYamlPath, 'utf-8');
        const parsedYaml: any = load(yamlContent);

        const fioriToolsPreview = parsedYaml.server.customMiddleware.find(
            (mw: any) => mw.name === 'fiori-tools-preview'
        );

        expect(fioriToolsPreview).toBeDefined();
        expect(fioriToolsPreview.configuration.flp).toBeDefined();
        expect(fioriToolsPreview.configuration.flp.intent.object).toBe('testapp');
        expect(fioriToolsPreview.configuration.debug).toBe(false);
    });

    test('invalid configuration should fail validation', () => {
        const yamlContent = readFileSync(invalidYamlPath, 'utf-8');
        const parsedYaml: any = load(yamlContent);

        const previewMiddleware = parsedYaml.server.customMiddleware.find(
            (mw: any) => mw.name === 'preview-middleware'
        );

        expect(previewMiddleware).toBeDefined();

        const validate = ajv.compile(middlewareSchema);
        const valid = validate(previewMiddleware.configuration);

        // The invalid configuration has:
        // 1. Invalid framework value (should be 'OPA5', 'QUnit', or 'Testsuite')
        // 2. Extra invalid properties (invalidProperty in flp, unknownProperty at root)

        // Validation should fail
        expect(valid).toBe(false);
        expect(validate.errors).toBeDefined();
        expect(validate.errors!.length).toBeGreaterThan(0);

        // Check that we have errors for both:
        // 1. Invalid framework enum value
        const frameworkError = validate.errors!.find(
            (err: any) => err.instancePath.includes('/test/0/framework') || err.params?.allowedValues
        );
        expect(frameworkError).toBeDefined();

        // 2. Additional properties violations (unknownProperty at root level)
        const additionalPropsError = validate.errors!.find((err: any) => err.keyword === 'additionalProperties');
        expect(additionalPropsError).toBeDefined();
    });
});
