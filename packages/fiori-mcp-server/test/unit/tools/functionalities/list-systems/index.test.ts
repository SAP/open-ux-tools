import listSystems from '../../../../../src/tools/functionalities/list-systems';
import details from '../../../../../src/tools/functionalities/list-systems/details';
import executeFunctionality from '../../../../../src/tools/functionalities/list-systems/execute-functionality';

describe('list-systems index', () => {
    test('should export functionality with correct structure', () => {
        expect(listSystems).toBeDefined();
        expect(listSystems.id).toBe('list-systems');
        expect(listSystems.details).toBe(details);
        expect(listSystems.handlers).toBeDefined();
    });

    test('should have handlers object with required methods', () => {
        expect(listSystems.handlers).toHaveProperty('getFunctionalityDetails');
        expect(listSystems.handlers).toHaveProperty('executeFunctionality');
        expect(typeof listSystems.handlers.getFunctionalityDetails).toBe('function');
        expect(typeof listSystems.handlers.executeFunctionality).toBe('function');
    });

    test('should have executeFunctionality handler pointing to correct implementation', () => {
        expect(listSystems.handlers.executeFunctionality).toBe(executeFunctionality);
    });

    test('should return details from getFunctionalityDetails', async () => {
        const result = await listSystems.handlers.getFunctionalityDetails();
        expect(result).toEqual(details);
    });

    test('getFunctionalityDetails should resolve to details object', async () => {
        const result = await listSystems.handlers.getFunctionalityDetails();
        expect(result).toMatchObject({
            functionalityId: 'list-systems',
            name: 'List SAP Systems'
        });
        expect(typeof result.description).toBe('string');
        expect(typeof result.parameters).toBe('object');
        expect(result.parameters.type).toBe('object');
    });

    test('should have correct functionalityId in exported object', () => {
        expect(listSystems.id).toBe(details.functionalityId);
    });
});
