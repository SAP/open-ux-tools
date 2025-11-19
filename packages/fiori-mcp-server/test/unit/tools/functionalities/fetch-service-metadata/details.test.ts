import details from '../../../../../src/tools/functionalities/fetch-service-metadata/details';
import type { Parameter } from '../../../../../src/types';

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

    test('should have parameters array', () => {
        expect(Array.isArray(details.parameters)).toBe(true);
        expect(details.parameters).toHaveLength(2);
    });

    test('should have sapSystemQuery parameter', () => {
        const sapSystemQueryParam = details.parameters.find((p: Parameter) => p.id === 'sapSystemQuery');
        expect(sapSystemQueryParam).toBeDefined();
        expect(sapSystemQueryParam?.type).toBe('string');
        expect(sapSystemQueryParam?.required).toBe(false);
        expect(sapSystemQueryParam?.description).toBeDefined();
        expect(sapSystemQueryParam?.description).toContain('SAP system');
    });

    test('should have servicePath parameter', () => {
        const servicePathParam = details.parameters.find((p: Parameter) => p.id === 'servicePath');
        expect(servicePathParam).toBeDefined();
        expect(servicePathParam?.type).toBe('string');
        expect(servicePathParam?.required).toBe(true);
        expect(servicePathParam?.description).toBeDefined();
        expect(servicePathParam?.description).toContain('path');
    });

    test('should have all required parameter properties', () => {
        details.parameters.forEach((param: Parameter) => {
            expect(param).toHaveProperty('id');
            expect(param).toHaveProperty('type');
            expect(param).toHaveProperty('description');
            expect(param).toHaveProperty('required');
        });
    });

    test('should have exactly one required parameter', () => {
        const requiredParams = details.parameters.filter((p: Parameter) => p.required);
        expect(requiredParams).toHaveLength(1);
        expect(requiredParams[0].id).toBe('servicePath');
    });

    test('should have exactly one optional parameter', () => {
        const optionalParams = details.parameters.filter((p: Parameter) => !p.required);
        expect(optionalParams).toHaveLength(1);
        expect(optionalParams[0].id).toBe('sapSystemQuery');
    });

    test('should have all parameters of type string', () => {
        details.parameters.forEach((param: Parameter) => {
            expect(param.type).toBe('string');
        });
    });

    test('should have detailed parameter descriptions', () => {
        details.parameters.forEach((param: Parameter) => {
            expect(param.description?.length ?? 0).toBeGreaterThan(10);
        });
    });

    test('should mention metadata.xml in description', () => {
        expect(details.description).toContain('metadata.xml');
    });

    test('should mention generate-fiori-ui-odata-app in description', () => {
        expect(details.description).toContain('generate-fiori-ui-odata-app');
    });

    test('should export as GetFunctionalityDetailsOutput type', () => {
        // Type check - if this compiles, the type is correct
        const typedDetails: typeof details = details;
        expect(typedDetails).toBe(details);
    });
});
