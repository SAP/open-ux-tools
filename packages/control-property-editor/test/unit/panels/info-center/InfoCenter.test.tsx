import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import { InfoCenter } from '../../../../src/panels/info-center';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import {
    clearAllInfoCenterMessages,
    toggleExpandMessage,
    readMessage,
    toggleModalMessage
} from '@sap-ux-private/control-property-editor-common';

describe('InfoCenter Component', () => {
    test('renders the InfoCenter component correctly', () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: { title: 'Title 1', description: 'Test Description 1', details: 'Details 1' },
                        type: MessageBarType.info,
                        expandable: true,
                        expanded: false,
                        read: false,
                        modal: false
                    },
                    {
                        message: { title: 'Title 2', description: 'Test Description 2' },
                        type: MessageBarType.warning,
                        expandable: false,
                        read: true,
                        modal: false
                    }
                ]
            }
        });

        // Check if the component's title is rendered
        const header = screen.getByText(/info center/i);
        expect(header).toBeInTheDocument();

        // Check for the messages
        const messageText1 = screen.getByText(/test description 1/i);
        expect(messageText1).toBeInTheDocument();

        const messageText2 = screen.getByText(/test description 2/i);
        expect(messageText2).toBeInTheDocument();
    });

    test('handles message actions correctly', async () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: { title: 'Title', description: 'Expandable Message', details: 'More Details' },
                        type: MessageBarType.info,
                        expandable: true,
                        expanded: false,
                        read: false,
                        modal: false
                    }
                ]
            }
        });

        const expandableMessage = screen.getByText(/expandable message/i);
        expect(expandableMessage).toBeInTheDocument();

        // Simulate expanding the message
        const expandButton = screen.getByText(/more/i);
        fireEvent.click(expandButton);
        expect(dispatch).toBeCalledWith(toggleExpandMessage(0));

        // Simulate open the message detatils in modal
        const modalButton = screen.getByText(/view details/i);
        fireEvent.click(modalButton);
        expect(dispatch).toBeCalledWith(toggleModalMessage(0));

        // Simulate marking the message as read
        fireEvent.mouseOver(expandableMessage);
        expect(dispatch).toBeCalledWith(readMessage(0));
    });

    test('close modal with message details correctly', () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: { title: 'Title', description: 'Message', details: 'More Details' },
                        type: MessageBarType.info,
                        expandable: false,
                        expanded: false,
                        read: false,
                        modal: true
                    }
                ]
            }
        });

        // Simulate closing of modal
        const closeModalButton = screen.getByText(/close/i);
        fireEvent.click(closeModalButton);
        expect(dispatch).toBeCalledWith(toggleModalMessage(0));
    });

    test('clears messages correctly', () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: { title: 'Test Message 1', description: 'Description 1' },
                        type: MessageBarType.error,
                        expandable: false,
                        read: false,
                        modal: false
                    }
                ]
            }
        });

        // Simulate clearing all messages
        const clearAllButton = screen.getByRole('button', { name: /clear-all/i }) || screen.getByLabelText('clear-all');
        fireEvent.click(clearAllButton);
        expect(dispatch).toBeCalledWith(clearAllInfoCenterMessages());
    });
});
