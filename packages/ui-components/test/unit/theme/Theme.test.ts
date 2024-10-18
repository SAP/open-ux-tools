import { initTheme } from '../../../src';
import * as fluentUI from '@fluentui/react';

describe('initTheme', () => {
    it('initTheme', () => {
        const createThemeSpy = jest.spyOn(fluentUI, 'createTheme');
        initTheme();
        expect(createThemeSpy).toBeCalledWith({
            defaultFontStyle: {
                WebkitFontSmoothing: ''
            }
        });
    });
});
