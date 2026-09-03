import React from 'react';
import { jest } from '@jest/globals';

const mockWebViewReady = jest.fn();
const mockRender = jest.fn();
const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockSubscribe = jest.fn();

jest.unstable_mockModule('../../src/state', () => ({
    actions: { webViewReady: mockWebViewReady },
    store: { getState: mockGetState, dispatch: mockDispatch, subscribe: mockSubscribe }
}));

jest.unstable_mockModule('react-dom', () => ({
    default: { render: mockRender },
    render: mockRender
}));

jest.unstable_mockModule('../../src/components/App', () => ({
    default: () => <div>App</div>
}));

jest.unstable_mockModule('@sap-ux/ui-components', () => ({
    initIcons: jest.fn(),
    initTheme: jest.fn()
}));

jest.unstable_mockModule('../../src/i18n', () => ({
    initI18n: jest.fn()
}));

describe('entry point', () => {
    it('runs startApp without crashing', async () => {
        document.body.innerHTML = '<div id="root"></div>';

        await import('../../src/store');

        expect(mockRender).toHaveBeenCalled();
        expect(mockWebViewReady).toHaveBeenCalled();
    });
});
