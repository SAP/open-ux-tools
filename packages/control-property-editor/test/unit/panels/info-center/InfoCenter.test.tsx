import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import { InfoCenter } from '../../../../src/panels/info-center';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import {
    clearAllInfoCenterMessages,
    readMessage,
    toggleModalMessage,
    toggleExpandMessage
} from '../../../../src/slice';

describe('InfoCenter Component', () => {
    test('renders the InfoCenter component correctly', () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: {
                            type: MessageBarType.info,
                            title: 'Title 1',
                            description: 'Test Description 1',
                            details: 'Details 1'
                        },
                        expandable: true,
                        expanded: false,
                        read: false,
                        modal: false,
                        id: 'testid1'
                    },
                    {
                        message: { type: MessageBarType.warning, title: 'Title 2', description: 'Test Description 2' },
                        expandable: false,
                        read: true,
                        modal: false,
                        id: 'testid2'
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
                        message: {
                            type: MessageBarType.info,
                            title: 'Title',
                            description: 'Expandable Message',
                            details: 'More Details'
                        },
                        expandable: true,
                        expanded: false,
                        read: false,
                        modal: false,
                        id: 'testid'
                    }
                ]
            }
        });

        const expandableMessage = screen.getByText(/expandable message/i);
        expect(expandableMessage).toBeInTheDocument();

        // Simulate expanding the message
        const expandButton = screen.getByText(/more/i);
        fireEvent.click(expandButton);
        expect(dispatch).toBeCalledWith(toggleExpandMessage('testid'));

        // Simulate open the message details in modal
        const modalButton = screen.getByText(/view details/i);
        fireEvent.click(modalButton);
        expect(dispatch).toBeCalledWith(toggleModalMessage('testid'));

        // Simulate marking the message as read
        fireEvent.mouseOver(expandableMessage);
        expect(dispatch).toBeCalledWith(readMessage('testid'));
    });

    test('close modal with message details correctly', () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: {
                            type: MessageBarType.info,
                            title: 'Title',
                            description: 'Message',
                            details: 'More Details'
                        },
                        expandable: true,
                        expanded: false,
                        read: false,
                        modal: false,
                        id: 'testid'
                    }
                ]
            }
        });

        // Simulate open the message details in modal
        const modalButton = screen.getByText(/view details/i);
        fireEvent.click(modalButton);
        // Simulate closing of modal
        const closeModalButton = screen.getByText(/close/i);
        fireEvent.click(closeModalButton);
        expect(dispatch).toBeCalledWith(toggleModalMessage('testid'));
    });

    test('clears messages correctly', () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: { type: MessageBarType.error, title: 'Test Message 1', description: 'Description 1' },
                        expandable: false,
                        read: false,
                        modal: false,
                        id: 'testid'
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
