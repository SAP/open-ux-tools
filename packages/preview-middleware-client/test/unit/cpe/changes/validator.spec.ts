import type UI5Element from 'sap/ui/core/Element';
import { validateBindingModel } from '../../../../src/cpe/changes/validator';
import { getTextBundle } from '../../../../src/i18n';

jest.mock('../../../../src/i18n');

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

    let getTextMock: jest.Mock;

    beforeEach(() => {
        getTextMock = jest.fn();

        (getTextBundle as jest.Mock).mockResolvedValue({
            hasText: jest.fn().mockReturnValue(true),
            getText: getTextMock
        });
    });

    afterEach(() => {
        getTextMock.mockClear();
    })

    test('should throw when invalid binding model string is provided', async () => {
        getTextMock.mockReturnValue('Invalid binding string.');
        await expect(() => validateBindingModel(mockModifiedcontrol as unknown as UI5Element, '{}')).rejects.toThrow('Invalid binding string.');
    });

    test('should throw when invalid binding string for i18n model is provided', async () => {
        getTextMock.mockReturnValue('Invalid binding string. Supported value pattern is {i18n>YOUR_KEY}');
        await expect(() => validateBindingModel(mockModifiedcontrol as unknown as UI5Element, '{ i18n }')).rejects.toThrow('Invalid binding string. Supported value pattern is {i18n>YOUR_KEY}');
    });

    test('should throw when the provided key does not exist in i18n.properties', async () => {
        getTextMock.mockReturnValue('Invalid key in the binding string. Supported value pattern is {i18n>YOUR_KEY}. Check if the key already exists in i18n.properties.If not, add the key in the i18n.properties file and reload the editor for the new key to take effect.');
        await expect(() => validateBindingModel(mockModifiedcontrol as unknown as UI5Element, '{ i18n>test }')).rejects.toThrow('Invalid key in the binding string. Supported value pattern is {i18n>YOUR_KEY}. Check if the key already exists in i18n.properties.If not, add the key in the i18n.properties file and reload the editor for the new key to take effect.');
    });

    test('should throw error when invalid binding model is provided', async () => {
        getTextMock.mockReturnValue('Invalid binding model.');
        const control = {
            getModel: jest.fn().mockReturnValue(undefined)
        };
        await expect(() => validateBindingModel(control as unknown as UI5Element, '{ i18n>test }')).rejects.toThrow('Invalid binding model.');
    });
});
