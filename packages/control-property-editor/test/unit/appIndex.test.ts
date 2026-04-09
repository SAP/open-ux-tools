import { jest } from '@jest/globals';
import * as actualUiComponents from '@sap-ux/ui-components';

const mockInitI18n = jest.fn();
const mockRegisterAppIcons = jest.fn();
const mockInitIcons = jest.fn();
const mockInitTheme = jest.fn();
const mockReactDOMRender = jest.fn();

jest.unstable_mockModule('../../src/i18n', () => ({
    initI18n: mockInitI18n
}));

jest.unstable_mockModule('../../src/icons', () => ({
    registerAppIcons: mockRegisterAppIcons,
    IconName: {}
}));

jest.unstable_mockModule('@sap-ux/ui-components', () => ({
    ...actualUiComponents,
    initIcons: mockInitIcons,
    initTheme: mockInitTheme
}));

jest.unstable_mockModule('react-dom', () => ({
    default: { render: mockReactDOMRender },
    render: mockReactDOMRender
}));

const { start } = await import('../../src/index');
const { store } = await import('../../src/store');
const { initializeLivereload, setFeatureToggles, setProjectScenario } = await import('../../src/slice');

describe('index', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    test('start', () => {
        const previewUrl = 'URL';
        const rootElementId = 'root';
        const features = [
            {
                feature: 'test.feature',
                isEnabled: true
            }
        ];
        start({ previewUrl, rootElementId, livereloadPort: 8080, scenario: 'APP_VARIANT', features });
        expect(mockInitI18n).toHaveBeenCalledTimes(1);
        expect(mockRegisterAppIcons).toHaveBeenCalledTimes(1);
        expect(mockInitIcons).toHaveBeenCalledTimes(1);
        expect(mockInitTheme).toHaveBeenCalledTimes(1);
        expect(mockReactDOMRender).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).toHaveBeenCalledTimes(3);
        expect(dispatchSpy).toHaveBeenNthCalledWith(1, setFeatureToggles(features));
        expect(dispatchSpy).toHaveBeenNthCalledWith(2, setProjectScenario('APP_VARIANT'));
        expect(dispatchSpy).toHaveBeenNthCalledWith(3, initializeLivereload({ port: 8080, url: undefined }));
    });
});
