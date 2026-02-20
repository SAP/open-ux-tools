import React from 'react';
import '../../src/store';
import { actions } from '../../src/state';
import ReactDOM from 'react-dom';

jest.mock('../../src/state', () => ({
    actions: { webViewReady: jest.fn() },
    store: { getState: jest.fn(), dispatch: jest.fn(), subscribe: jest.fn() }
}));

jest.mock('react-dom', () => ({
    render: jest.fn()
}));

jest.mock('../../src/components/App', () => () => <div>App</div>);
jest.mock('@sap-ux/ui-components', () => ({
    initIcons: jest.fn(),
    initTheme: jest.fn()
}));
jest.mock('../../src/i18n', () => ({ initI18n: jest.fn() }));

describe('entry point', () => {
    it('runs startApp without crashing', () => {
        document.body.innerHTML = '<div id="root"></div>';

        expect(ReactDOM.render).toHaveBeenCalled();
        expect(actions.webViewReady).toHaveBeenCalled();
    });
});
