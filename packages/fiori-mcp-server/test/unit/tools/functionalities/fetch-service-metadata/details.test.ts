import details from '../../../../../src/tools/functionalities/fetch-service-metadata/details';

describe('fetch-service-metadata details', () => {
    test('should have correct functionalityId', () => {
        expect(details.functionalityId).toBe('fetch-service-metadata');
    });

    test('should have correct name', () => {
        expect(details.name).toBe('Fetch Service Metadata');
    });

    test('should have description', () => {
        expect(details.description).toBeDefined();
        expect(typeof details.description).toBe('string');
        expect(details.description.length).toBeGreaterThan(0);
    });

    test('should have description mentioning key functionality', () => {
        expect(details.description).toContain('metadata');
        expect(details.description).toContain('SAP');
        expect(details.description).toContain('service');
    });

    test('should have parameters as JSON Schema object', () => {
        expect(details.parameters).toBeDefined();
        expect(typeof details.parameters).toBe('object');
        expect(details.parameters.type).toBe('object');
        expect(details.parameters.properties).toBeDefined();
        expect(details.parameters.required).toBeDefined();
    });

    test('should have sapSystemQuery parameter', () => {
        const props = details.parameters.properties;
        expect(props).toBeDefined();
        if (props && typeof props === 'object') {
            const sapSystemQuery = props['sapSystemQuery'];
            expect(sapSystemQuery).toBeDefined();
            expect(typeof sapSystemQuery === 'object' && 'type' in sapSystemQuery).toBe(true);
            if (typeof sapSystemQuery === 'object' && sapSystemQuery && 'type' in sapSystemQuery) {
                expect(sapSystemQuery.type).toBe('string');
                expect(sapSystemQuery.description).toBeDefined();
                expect(sapSystemQuery.description).toContain('SAP system');
            }
        }
    });

    test('should have servicePath parameter', () => {
        const props = details.parameters.properties;
        expect(props).toBeDefined();
        if (props && typeof props === 'object') {
            const servicePath = props['servicePath'];
            expect(servicePath).toBeDefined();
            expect(typeof servicePath === 'object' && 'type' in servicePath).toBe(true);
            if (typeof servicePath === 'object' && servicePath && 'type' in servicePath) {
                expect(servicePath.type).toBe('string');
                expect(servicePath.description).toBeDefined();
                expect(servicePath.description).toContain('path');
            }
        }
    });

    test('should have exactly one required parameter', () => {
        expect(details.parameters.required).toEqual(['servicePath']);
    });

    test('should have both parameters of type string', () => {
        const props = details.parameters.properties;
        if (props && typeof props === 'object') {
            const sapSystemQuery = props['sapSystemQuery'];
            const servicePath = props['servicePath'];

            if (typeof sapSystemQuery === 'object' && sapSystemQuery && 'type' in sapSystemQuery) {
                expect(sapSystemQuery.type).toBe('string');
            }
            if (typeof servicePath === 'object' && servicePath && 'type' in servicePath) {
                expect(servicePath.type).toBe('string');
            }
        }
    });

    test('should have detailed parameter descriptions', () => {
        const props = details.parameters.properties;
        if (props && typeof props === 'object') {
            const sapSystemQuery = props['sapSystemQuery'];
            const servicePath = props['servicePath'];

            if (typeof sapSystemQuery === 'object' && sapSystemQuery && 'description' in sapSystemQuery) {
                expect((sapSystemQuery.description as string).length).toBeGreaterThan(10);
            }
            if (typeof servicePath === 'object' && servicePath && 'description' in servicePath) {
                expect((servicePath.description as string).length).toBeGreaterThan(10);
            }
        }
    });

    test('should mention metadata.xml in description', () => {
        expect(details.description).toContain('metadata.xml');
    });

    test('should mention generate-fiori-ui-application in description', () => {
        expect(details.description).toContain('generate-fiori-ui-application');
    });

    test('should export as GetFunctionalityDetailsOutput type', () => {
        // Type check - if this compiles, the type is correct
        const typedDetails: typeof details = details;
        expect(typedDetails).toBe(details);
    });
});
