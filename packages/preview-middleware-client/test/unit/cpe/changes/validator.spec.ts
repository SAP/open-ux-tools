import type UI5Element from 'sap/ui/core/Element';
import { validateBindingModel } from '../../../../src/cpe/changes/validator';

describe('vaildateBindingModel', () => {
    const mockModifiedcontrol = {
        getModel: jest.fn().mockReturnValue({
            getResourceBundle: jest.fn().mockReturnValue(
                {
                    getText: jest.fn().mockImplementation(() => false)
                }
            )
        })
    };

    test('should throw when invalid binding model string is provided', async () => {
        await expect(() => validateBindingModel(mockModifiedcontrol as unknown as UI5Element, '{}')).rejects.toThrow('Invalid binding string.');
    });

    test('should throw when invalid binding string for i18n model is provided', async () => {
        await expect(() => validateBindingModel(mockModifiedcontrol as unknown as UI5Element, '{ i18n }')).rejects.toThrow('Invalid binding string. The supported value pattern is {i18n>YOUR_KEY}');
    });

    test('should throw when the provided key does not exist in i18n.properties', async () => {
        await expect(() => validateBindingModel(mockModifiedcontrol as unknown as UI5Element, '{ i18n>test }')).rejects.toThrow('Invalid key in the binding string. The supported value pattern is {i18n>YOUR_KEY}. Check if the key already exists in the `i18n.properties` file. If not, add the key in the `i18n.properties` file and reload the editor for the new key to take effect.');
    });

    test('should throw error when invalid binding model is provided', async () => {
        const control = {
            getModel: jest.fn().mockReturnValue(undefined)
        };
        await expect(() => validateBindingModel(control as unknown as UI5Element, '{ i18n>test }')).rejects.toThrow('Invalid binding model.');
    });
});
