import * as React from 'react';
import { render } from '@testing-library/react';
import { fireEvent, screen } from '@testing-library/dom';
import { LoadingState } from '../../../../../src/types';
import { actions } from '../../../../../src/state';
import { SystemMain } from '../../../../../src/components/layout/main/SystemMain';
import { useSystemMain } from '../../../../../src/hooks/useSystemMain';
import { AuthenticationType, SystemType } from '@sap-ux/store';

jest.mock('../../../../../src/hooks/useSystemMain');

const mockUseSystemMain = useSystemMain as jest.MockedFunction<typeof useSystemMain>;

describe('<SystemMain />', () => {
    const connectionStatus = {
        message: '',
        connected: false
    };

    const guidedAnswerLink = {
        linkText: 'Need help with this error',
        subText: 'Guided answers can help',
        command: {
            id: '2',
            params: 'param1'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const defaultMockHookReturn: Partial<ReturnType<typeof useSystemMain>> = {
        systemInfo: {
            name: 'dummy system',
            systemType: 'OnPrem' satisfies SystemType,
            authenticationType: 'basic' satisfies AuthenticationType,
            url: 'http://dummy',
            client: '000',
            username: 'user',
            password: 'pass'
        },
        systemUnSaved: false,
        defaultName: 'http://dummy',
        connectionStatus,
        guidedAnswerLink,
        showConnectionStatus: false,
        showUpdateSystemStatus: false,
        testConnectionBtnDisabled: false,
        saveButtonDisabled: false,
        isDetailsUpdated: false,
        isDetailsValid: true,
        systemState: LoadingState.Idle,
        testConnectionState: undefined,
        updateSystemStatus: undefined,
        addNewSapSystem: false,
        // Mock functions
        setName: jest.fn(),
        setType: jest.fn(),
        setUrl: jest.fn(),
        setClient: jest.fn(),
        setUsername: jest.fn(),
        setPassword: jest.fn(),
        resetStatus: jest.fn(),
        setIsDetailsUpdated: jest.fn(),
        setIsDetailsValid: jest.fn(),
        checkMandatoryFields: jest.fn(),
        isEmpty: jest.fn()
    };

    it('Test actions get called (test connection)', () => {
        mockUseSystemMain.mockReturnValue(defaultMockHookReturn as ReturnType<typeof useSystemMain>);

        const testConnectionSpy = jest.spyOn(actions, 'testConnection');
        const updateSystemSpy = jest.spyOn(actions, 'updateSystem');

        render(<SystemMain />);

        fireEvent.click(screen.getByText('Test Connection'));
        fireEvent.click(screen.getByText('Save'));

        expect(testConnectionSpy).toHaveBeenCalled();
        expect(updateSystemSpy).not.toHaveBeenCalled();
    });

    it('Test actions get called (save system)', () => {
        const mockHookReturn = {
            ...defaultMockHookReturn,
            connectionStatus: {
                message: 'Connected',
                connected: true
            }
        };
        mockUseSystemMain.mockReturnValue(mockHookReturn as ReturnType<typeof useSystemMain>);
        const updateSystemSpy = jest.spyOn(actions, 'updateSystem');

        render(<SystemMain />);

        fireEvent.click(screen.getByText('Test Connection'));
        fireEvent.click(screen.getByText('Save'));

        expect(updateSystemSpy).toHaveBeenCalled();
    });
});
