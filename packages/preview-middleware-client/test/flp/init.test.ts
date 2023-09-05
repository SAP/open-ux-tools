window.sap = {
    ui: {
        require: {
            toUrl: jest.fn()
        } as any
    } as any
} as any;

import { registerSAPFonts } from '../../src/flp/init';
import IconPoolMock from '../__mock__/sap/ui/core/IconPool';

describe('flp/init', () => {
    test('registerSAPFonts', () => {
        registerSAPFonts();
        expect(IconPoolMock.registerFont).toBeCalledTimes(2);
    });
});
