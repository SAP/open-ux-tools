import { mockBundle } from 'mock/sap/base/i18n/ResourceBundle';
import { vaildateBindingModel } from '../../../../src/cpe/changes/validator';

describe('vaildateBindingModel', () => {
    test('should throw when invalid binding model string is provided', () => {
        try {
            vaildateBindingModel('{}');
        } catch (error) {
            expect(error).toBeInstanceOf(SyntaxError);
            expect(error.message).toBe('Invalid binding string.');
        }
    });

    test('should throw when invalid binding string for i18n model is provided', () => {
        try {
            vaildateBindingModel('{ i18n }');
        } catch (error) {
            expect(error).toBeInstanceOf(SyntaxError);
            expect(error.message).toBe('Invalid binding string. Supported value pattern is {i18n>YOUR_KEY}');
        }
    });

    test('should throw when the provided key does not exist in i18n.properties', () => {
        try {
            mockBundle.hasText.mockReturnValueOnce(false);
            vaildateBindingModel('{ i18n>test }');
        } catch (error) {
            expect(error).toBeInstanceOf(SyntaxError);
            expect(error.message).toBe(
                'Invalid key in the binding string. Supported value pattern is {i18n>YOUR_KEY}. Check if the key already exists in i18n.properties. If not, add the key in the i18n.properties file and reload the editor for the new key to take effect.'
            );
        }
    });
});
