import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../utils';
import { InfoCenter } from '../../../../src/panels/info-center';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import { clearAllInfoCenterMessages, clearInfoCenterMessage, expandableMessage } from '../../../../src/slice';

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
                        id: 'testid1'
                    },
                    {
                        message: { type: MessageBarType.warning, title: 'Title 2', description: 'Test Description 2' },
                        expandable: false,
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
                        id: 'testid'
                    }
                ]
            }
        });

        const expandableMessage = screen.getByText(/expandable message/i);
        expect(expandableMessage).toBeInTheDocument();

        // Simulate expanding the message by clicking the "more-less" text.
        // Initially, the "more-less" button should display "MORE".
        const moreLessButton = screen.getByText(/more/i);
        fireEvent.click(moreLessButton);
        await waitFor(() => {
            expect(expandableMessage.className).toMatch(/expanded/);
        });

        // Simulate opening the message details in a modal.
        const viewDetailsButton = screen.getByText(/view details/i);
        fireEvent.click(viewDetailsButton);
        const modalTextArea = screen.getByRole('textbox');
        expect(modalTextArea).toBeInTheDocument();

        // Simulate closing the modal.
        const closeButton = screen.getByText(/close/i);
        fireEvent.click(closeButton);
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });

        // Simulate marking the message as read
        fireEvent.mouseOver(expandableMessage);
        const messageBar = expandableMessage.closest('.message-bar');
        await waitFor(() => {
            expect(messageBar).toHaveClass('message-read');
        });

        // Simulate deleting the message
        const deleteButton = await screen.findByLabelText(/remove-message/i);
        fireEvent.click(deleteButton);
        expect(dispatch).toHaveBeenCalledWith(clearInfoCenterMessage('testid'));
    });

    test('clears messages correctly', () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: { type: MessageBarType.error, title: 'Test Message 1', description: 'Description 1' },
                        expandable: false,
                        id: 'testid'
                    }
                ]
            }
        });

        // Simulate clearing all messages
        const clearAllButton = screen.getByRole('button', { name: /clear-all/i }) || screen.getByLabelText('clear-all');
        fireEvent.click(clearAllButton);
        expect(dispatch).toHaveBeenCalledWith(clearAllInfoCenterMessages());
    });

    test('does not dispatch expandableMessage when element is already marked as expandable', async () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: { type: MessageBarType.warning, title: 'Title 2', description: 'Test Description 2' },
                        expandable: false,
                        id: 'testid2'
                    },
                    {
                        message: {
                            type: MessageBarType.info,
                            title: 'Title',
                            description: 'Expandable Message',
                            details: 'More Details'
                        },
                        expandable: true,
                        id: 'testid'
                    }
                ]
            }
        });

        const message = screen.getByText(/expandable message/i);
        expect(message).toBeInTheDocument();

        // Simulate overflow: scrollHeight > clientHeight.
        Object.defineProperty(message, 'scrollHeight', { value: 200, configurable: true });
        Object.defineProperty(message, 'clientHeight', { value: 100, configurable: true });
        const messageForDeletion = screen.getByText(/test description 2/i);
        expect(messageForDeletion).toBeInTheDocument();
        fireEvent.mouseOver(messageForDeletion);
        const deleteButton = await screen.findByLabelText(/remove-message/i);
        // Simulate deletion to triger dispatch
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(dispatch).not.toHaveBeenCalledWith(expandableMessage('testid'));
        });
    });

    test('dispatches expandableMessage when element overflows and is not marked expandable', async () => {
        const { dispatch } = render(<InfoCenter />, {
            initialState: {
                infoCenterMessages: [
                    {
                        message: { type: MessageBarType.warning, title: 'Title 2', description: 'Test Description 2' },
                        expandable: false,
                        id: 'testid2'
                    },
                    {
                        message: {
                            type: MessageBarType.info,
                            title: 'Title',
                            description: 'Expandable Message',
                            details: 'More Details'
                        },
                        expandable: false,
                        id: 'testid'
                    }
                ]
            }
        });

        const message = screen.getByText(/expandable message/i);
        expect(message).toBeInTheDocument();

        // Simulate overflow: scrollHeight > clientHeight.
        Object.defineProperty(message, 'scrollHeight', { value: 200, configurable: true });
        Object.defineProperty(message, 'clientHeight', { value: 100, configurable: true });
        const messageForDeletion = screen.getByText(/test description 2/i);
        expect(messageForDeletion).toBeInTheDocument();
        fireEvent.mouseOver(messageForDeletion);
        const deleteButton = await screen.findByLabelText(/remove-message/i);
        // Simulate deletion to triger dispatch
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(dispatch).toHaveBeenCalledWith(expandableMessage('testid'));
        });
    });
});
