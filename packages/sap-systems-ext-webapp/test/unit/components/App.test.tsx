import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { Provider } from 'react-redux';
import App from '../../../src/components/App';
import '@testing-library/jest-dom';
import { store } from '../../../src/state';
import { TEST_CONNECTION_STATUS, UPDATE_SYSTEM_STATUS } from '@sap-ux/sap-systems-ext-types';

describe('App test', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn()
            }))
        });
    });

    test('Render App component', () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>
        );
        expect(screen.getByRole('banner').querySelector('.store-header')).toBeTruthy();
    });

    test('Dispatch TEST_CONNECTION_STATUS action and verify UI is updated', async () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>
        );

        store.dispatch({
            type: TEST_CONNECTION_STATUS,
            payload: {
                connectionStatus: { message: 'Provide URL', connected: false }
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Provide URL')).toBeTruthy();
        });
    });

    test('Dispatch UPDATE_SYSTEM_STATUS action and verify UI is updated', async () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>
        );

        store.dispatch({
            type: UPDATE_SYSTEM_STATUS,
            payload: {
                message: 'System details saved',
                updateSuccess: true
            }
        });

        await waitFor(() => {
            expect(screen.getByText('System details saved')).toBeTruthy();
        });
    });

    test('Dispatch UPDATE_SYSTEM_STATUS action and verify UI is updated when message is defined', async () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>
        );

        store.dispatch({
            type: UPDATE_SYSTEM_STATUS,
            payload: {
                message: 'System cannot be saved',
                updateSuccess: false
            }
        });

        await waitFor(() => {
            expect(screen.getByText('System cannot be saved')).toBeTruthy();
        });
    });
});
