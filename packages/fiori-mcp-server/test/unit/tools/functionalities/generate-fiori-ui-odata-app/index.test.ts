import generateFioriUiOdataApp from '../../../../../src/tools/functionalities/generate-fiori-ui-odata-app';
import details from '../../../../../src/tools/functionalities/generate-fiori-ui-odata-app/details';

describe('generate-fiori-ui-odata-app index', () => {
    test('should export functionality with correct structure', () => {
        expect(generateFioriUiOdataApp).toBeDefined();
        expect(generateFioriUiOdataApp.id).toBe('generate-fiori-ui-odata-app');
        expect(generateFioriUiOdataApp.details).toBe(details);
        expect(generateFioriUiOdataApp.handlers).toBeDefined();
    });

    test('should have handlers object with required methods', () => {
        expect(generateFioriUiOdataApp.handlers).toHaveProperty('getFunctionalityDetails');
        expect(generateFioriUiOdataApp.handlers).toHaveProperty('executeFunctionality');
        expect(typeof generateFioriUiOdataApp.handlers.getFunctionalityDetails).toBe('function');
        expect(typeof generateFioriUiOdataApp.handlers.executeFunctionality).toBe('function');
    });

    test('should return details from getFunctionalityDetails', async () => {
        const result = await generateFioriUiOdataApp.handlers.getFunctionalityDetails({
            appPath: '',
            functionalityId: ''
        });
        expect(result).toEqual(details);
    });

    test('getFunctionalityDetails should resolve to details object', async () => {
        const result = await generateFioriUiOdataApp.handlers.getFunctionalityDetails({
            appPath: '',
            functionalityId: ''
        });
        expect(result).toMatchObject({
            functionalityId: 'generate-fiori-ui-odata-app',
            name: 'Generate SAP Fiori UI Application for OData Projects (non-CAP)'
        });
        expect(typeof result.description).toBe('string');
    });

    test('should have correct functionalityId in exported object', () => {
        expect(generateFioriUiOdataApp.id).toBe(details.functionalityId);
    });
});
