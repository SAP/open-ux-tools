import fetchServiceMetadata from '../../../../../src/tools/functionalities/fetch-service-metadata';
import details from '../../../../../src/tools/functionalities/fetch-service-metadata/details';
import executeFunctionality from '../../../../../src/tools/functionalities/fetch-service-metadata/execute-functionality';

describe('fetch-service-metadata index', () => {
    test('should export functionality with correct structure', () => {
        expect(fetchServiceMetadata).toBeDefined();
        expect(fetchServiceMetadata.id).toBe('fetch-service-metadata');
        expect(fetchServiceMetadata.details).toBe(details);
        expect(fetchServiceMetadata.handlers).toBeDefined();
    });

    test('should have handlers object with required methods', () => {
        expect(fetchServiceMetadata.handlers).toHaveProperty('getFunctionalityDetails');
        expect(fetchServiceMetadata.handlers).toHaveProperty('executeFunctionality');
        expect(typeof fetchServiceMetadata.handlers.getFunctionalityDetails).toBe('function');
        expect(typeof fetchServiceMetadata.handlers.executeFunctionality).toBe('function');
    });

    test('should have executeFunctionality handler pointing to correct implementation', () => {
        expect(fetchServiceMetadata.handlers.executeFunctionality).toBe(executeFunctionality);
    });

    test('should return details from getFunctionalityDetails', async () => {
        const result = await fetchServiceMetadata.handlers.getFunctionalityDetails({
            appPath: '',
            functionalityId: ''
        });
        expect(result).toEqual(details);
    });

    test('getFunctionalityDetails should resolve to details object', async () => {
        const result = await fetchServiceMetadata.handlers.getFunctionalityDetails({
            appPath: '',
            functionalityId: ''
        });
        expect(result).toMatchObject({
            functionalityId: 'fetch-service-metadata',
            name: 'Fetch Service Metadata'
        });
        expect(typeof result.description).toBe('string');
        expect(typeof result.parameters).toBe('object');
        expect(result.parameters.type).toBe('object');
    });

    test('should have correct functionalityId in exported object', () => {
        expect(fetchServiceMetadata.id).toBe(details.functionalityId);
    });
});
