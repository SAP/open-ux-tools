import { v4 as uuidv4 } from 'uuid';

import { getI18nDescription } from '../../../../src/writer/i18n';
import { BASE_I18N_DESCRIPTION, FlexLayer, RESOURCE_BUNDLE_TEXT, TRANSLATION_UUID_TEXT } from '../../../../src';

jest.mock('uuid', () => ({
    v4: jest.fn()
}));

const uuidMock = uuidv4 as jest.Mock;

describe('getI18nDescription', () => {
    beforeEach(() => {
        uuidMock.mockClear();
    });

    it('should return only base description for CUSTOMER_BASE layer', () => {
        const result = getI18nDescription(FlexLayer.CUSTOMER_BASE, 'My App');
        expect(result).toBe(BASE_I18N_DESCRIPTION);
        expect(uuidMock).not.toHaveBeenCalled();
    });

    it('should return full description with fixed UUID for non-customer layer', () => {
        const mockUUID = '123e4567-e89b-12d3-a456-42661';
        uuidMock.mockReturnValue(mockUUID);

        const appTitle = 'Demo App';
        const result = getI18nDescription(FlexLayer.VENDOR, appTitle);

        expect(uuidMock).toHaveBeenCalled();
        expect(result).toBe(BASE_I18N_DESCRIPTION + RESOURCE_BUNDLE_TEXT + appTitle + TRANSLATION_UUID_TEXT + mockUUID);
    });
});
