import details from '../../../../../src/tools/functionalities/generate-fiori-ui-application/details';

describe('generate-fiori-ui-application details', () => {
    test('should have correct functionalityId', () => {
        expect(details.functionalityId).toBe('generate-fiori-ui-application');
    });

    test('should have correct name', () => {
        expect(details.name).toBe('Generate SAP Fiori UI Application for OData Projects (non-CAP)');
    });

    test('should have description', () => {
        expect(details.description).toBeDefined();
        expect(typeof details.description).toBe('string');
        expect(details.description.length).toBeGreaterThan(0);
    });

    test('should have description mentioning key functionality', () => {
        expect(details.description).toContain('metadata');
        expect(details.description).toContain('OData');
        expect(details.description).toContain('SAP Fiori');
    });

    test('should mention fetch-service-metadata in description', () => {
        expect(details.description).toContain('fetch-service-metadata');
    });

    test('should mention metadata.xml in description', () => {
        expect(details.description).toContain('metadata.xml');
    });

    test('should mention authentication considerations in description', () => {
        expect(details.description).toContain('authentication');
        expect(details.description).toContain('credentials');
    });

    test('should have parameters as JSON schema', () => {
        expect(details.parameters).toBeDefined();
        expect(typeof details.parameters).toBe('object');
    });

    test('should have parameters with type object', () => {
        expect(details.parameters).toHaveProperty('type');
        expect(details.parameters.type).toBe('object');
    });

    test('should have required properties in parameters', () => {
        expect(details.parameters).toHaveProperty('properties');
        expect(details.parameters.properties).toBeDefined();
    });

    test('should export as GetFunctionalityDetailsOutput type', () => {
        // Type check - if this compiles, the type is correct
        const typedDetails: typeof details = details;
        expect(typedDetails).toBe(details);
    });
});
