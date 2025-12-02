import generateFioriUiApplication from '../../../../../src/tools/functionalities/generate-fiori-ui-application';
import details from '../../../../../src/tools/functionalities/generate-fiori-ui-application/details';

describe('generate-fiori-ui-application index', () => {
    test('should export functionality with correct structure', () => {
        expect(generateFioriUiApplication).toBeDefined();
        expect(generateFioriUiApplication.id).toBe('generate-fiori-ui-application');
        expect(generateFioriUiApplication.details).toBe(details);
        expect(generateFioriUiApplication.handlers).toBeDefined();
    });

    test('should have handlers object with required methods', () => {
        expect(generateFioriUiApplication.handlers).toHaveProperty('getFunctionalityDetails');
        expect(generateFioriUiApplication.handlers).toHaveProperty('executeFunctionality');
        expect(typeof generateFioriUiApplication.handlers.getFunctionalityDetails).toBe('function');
        expect(typeof generateFioriUiApplication.handlers.executeFunctionality).toBe('function');
    });

    test('should return details from getFunctionalityDetails', async () => {
        const result = await generateFioriUiApplication.handlers.getFunctionalityDetails({
            appPath: '',
            functionalityId: ''
        });
        expect(result).toEqual(details);
    });

    test('getFunctionalityDetails should resolve to details object', async () => {
        const result = await generateFioriUiApplication.handlers.getFunctionalityDetails({
            appPath: '',
            functionalityId: ''
        });
        expect(result).toMatchObject({
            functionalityId: 'generate-fiori-ui-application',
            name: 'Generate SAP Fiori UI Application for OData Projects (non-CAP)'
        });
        expect(typeof result.description).toBe('string');
    });

    test('should have correct functionalityId in exported object', () => {
        expect(generateFioriUiApplication.id).toBe(details.functionalityId);
    });
});
