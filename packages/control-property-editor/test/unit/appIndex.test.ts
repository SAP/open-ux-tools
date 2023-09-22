import { start } from '../../src/index';
import * as i18n from '../../src/i18n';
import * as icons from '../../src/icons';
import * as initIcon from '@sap-ux/ui-components/dist/components/Icons'; // bug in TS 4.6 https://github.com/microsoft/TypeScript/issues/43081
import ReactDOM from 'react-dom';

describe('index', () => {
    const i18nSpy = jest.spyOn(i18n, 'initI18n');
    const iconsSpy = jest.spyOn(icons, 'registerAppIcons');
    // ts-ignore
    const initIconSpy = jest.spyOn(initIcon, 'initIcons');
    const reactSpy = jest.spyOn(ReactDOM, 'render').mockReturnValue();

    test('start', () => {
        const previewUrl = 'URL';
        const rootElementId = 'root';
        start({ previewUrl, rootElementId });
        expect(i18nSpy).toHaveBeenCalledTimes(1);
        expect(iconsSpy).toHaveBeenCalledTimes(1);
        expect(initIconSpy).toHaveBeenCalledTimes(1);
        expect(reactSpy).toHaveBeenCalledTimes(1);
    });
});
