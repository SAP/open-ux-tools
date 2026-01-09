import React from 'react';
import { render, act } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { useSystemMain } from '../../../src/hooks/useSystemMain';
import { LoadingState } from '../../../src/types';

type TestProps = { onResult: (result: ReturnType<typeof useSystemMain>) => void };
function HookTestComponent({ onResult }: TestProps) {
    const hook = useSystemMain();
    React.useEffect(() => {
        onResult(hook);
    }, [hook, onResult]);
    return null;
}

describe('useSystemMain hook tests', () => {
    const mockStore = (preloadedState?: any) =>
        configureStore({
            reducer: (state = preloadedState, action) => state,
            preloadedState
        });

    let hookResult: ReturnType<typeof useSystemMain> | undefined;

    const baseState = {
        systemInfo: {
            name: 'dummy system',
            systemType: 'OnPrem',
            authenticationType: 'basic',
            url: 'http://dummy',
            client: '000',
            username: 'user',
            password: 'pass',
            serviceKey: ''
        },
        loadingState: undefined,
        testConnectionLoadingState: undefined,
        connectionStatus: undefined,
        guidedAnswerLink: undefined,
        updateSystemStatus: undefined,
        addNewSapSystem: false,
        hideServiceKey: false,
        unSaved: false
    };

    beforeEach(() => {
        hookResult = undefined;
    });

    describe('Button state management', () => {
        it('disables buttons when isDetailsValid is false', () => {
            const store = mockStore(baseState);

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            act(() => {
                hookResult?.setIsDetailsValid(false);
            });

            expect(hookResult?.testConnectionBtnDisabled).toBe(true);
            expect(hookResult?.saveButtonDisabled).toBe(true);
        });

        it('enables save button when mandatory fields are filled and details updated', () => {
            const store = mockStore({
                ...baseState,
                name: 'test system',
                url: 'http://test.com'
            });

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            act(() => {
                hookResult?.setIsDetailsUpdated(true);
                hookResult?.setIsDetailsValid(true);
            });

            expect(hookResult?.saveButtonDisabled).toBe(false);
        });
    });

    describe('Connection and system status effects', () => {
        it('shows connection status when connectionStatus is set', () => {
            // Start with no connection status
            const store = mockStore(baseState);

            const { rerender } = render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            // Initially should not show connection status
            expect(hookResult?.showConnectionStatus).toBe(false);

            // Now update store to have connection status
            const storeWithConnection = mockStore({
                ...baseState,
                connectionStatus: { message: 'Connected', connected: true }
            });

            rerender(
                <Provider store={storeWithConnection}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            expect(hookResult?.showConnectionStatus).toBe(true);
            expect(hookResult?.showUpdateSystemStatus).toBe(false);
        });

        it('shows edit system status when editSystemStatus has message', () => {
            const initialStore = mockStore(baseState);

            const { rerender } = render(
                <Provider store={initialStore}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            // Update store with editSystemStatus and rerender with new store instance
            const updatedStore = mockStore({
                ...baseState,
                updateSystemStatus: { message: 'System saved', updateSucess: true }
            });

            rerender(
                <Provider store={updatedStore}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            expect(hookResult?.showConnectionStatus).toBe(false);
            expect(hookResult?.showUpdateSystemStatus).toBe(true);
        });
    });

    describe('System state mapping', () => {
        it('maps loadingState to systemState', () => {
            const store = mockStore({
                ...baseState,
                loadingState: LoadingState.Loading
            });

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            expect(hookResult?.systemState).toBe(LoadingState.Loading);
        });

        it('defaults systemState to Idle when loadingState is undefined', () => {
            const store = mockStore({
                ...baseState,
                loadingState: undefined
            });

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            expect(hookResult?.systemState).toBe(LoadingState.Idle);
        });
    });

    describe('Utility functions', () => {
        it('isEmpty returns true for empty/undefined strings', () => {
            const store = mockStore(baseState);

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            expect(hookResult?.isEmpty('')).toBe(true);
            expect(hookResult?.isEmpty(undefined)).toBe(true);
            expect(hookResult?.isEmpty('test')).toBe(false);
        });
    });

    describe('Field setters', () => {
        it('setName updates systemInfo name', () => {
            const store = mockStore(baseState);

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            act(() => {
                hookResult?.setName('new name');
            });

            expect(hookResult?.systemInfo?.name).toBe('new name');
        });

        it('setType updates systemInfo type', () => {
            const store = mockStore(baseState);

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            act(() => {
                hookResult?.setType('AbapCloud');
            });

            expect(hookResult?.systemInfo?.systemType).toBe('AbapCloud');
        });
    });

    describe('Mandatory field validation', () => {
        it('checkMandatoryFields enables save when OnPremise system has name and url', () => {
            const store = mockStore({
                ...baseState,
                name: 'test system',
                url: 'http://test.com',
                type: 'OnPrem'
            });

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            act(() => {
                hookResult?.setIsDetailsUpdated(true);
                hookResult?.setIsDetailsValid(true);
                hookResult?.checkMandatoryFields();
            });

            expect(hookResult?.saveButtonDisabled).toBe(false);
        });

        it('checkMandatoryFields enables save when Cloud ReentranceTicket system has name and url', () => {
            const store = mockStore({
                ...baseState,
                name: 'test system',
                url: 'http://test.com',
                type: 'AbapCloud',
                authType: 'reentranceTicket'
            });

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            act(() => {
                hookResult?.setIsDetailsUpdated(true);
                hookResult?.setIsDetailsValid(true);
                hookResult?.checkMandatoryFields();
            });

            expect(hookResult?.saveButtonDisabled).toBe(false);
        });

        it('checkMandatoryFields disables save when mandatory fields are empty', () => {
            const store = mockStore({
                ...baseState,
                systemInfo: {
                    name: '',
                    url: ''
                }
            });

            render(
                <Provider store={store}>
                    <HookTestComponent
                        onResult={(result) => {
                            hookResult = result;
                        }}
                    />
                </Provider>
            );

            act(() => {
                hookResult?.checkMandatoryFields();
            });

            expect(hookResult?.saveButtonDisabled).toBe(true);
        });
    });
});
