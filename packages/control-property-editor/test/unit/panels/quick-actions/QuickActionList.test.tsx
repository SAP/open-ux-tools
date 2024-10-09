import React from 'react';
import { screen, fireEvent } from '@testing-library/react';

import { render } from '../../utils';
import { executeQuickAction } from '@sap-ux-private/control-property-editor-common';
import { QuickActionList } from '../../../../src/panels/quick-actions';

describe('QuickActionList', () => {
    test('check if quick action list rendered', () => {
        const children = [
            {
                label: 'submenu1',
                children: []
            },
            {
                label: 'submenu2',
                children: [
                    {
                        label: 'submenu2-submenu1',
                        children: []
                    },
                    {
                        label: 'submenu2-submenu2',
                        children: []
                    }
                ]
            }
        ];

        const { dispatch } = render(<QuickActionList />, {
            initialState: {
                quickActions: [
                    {
                        title: 'List Report',
                        actions: [
                            {
                                id: 'quick-action-1',
                                enabled: true,
                                kind: 'simple',
                                title: 'Quick Action 1'
                            },
                            {
                                id: 'quick-action-2',
                                enabled: true,
                                kind: 'nested',
                                title: 'Quick Action 2',
                                children: children
                            },
                            {
                                id: 'quick-action-3',
                                enabled: true,
                                kind: 'nested',
                                title: 'Quick Action 3',
                                children: [children[0]]
                            }
                        ]
                    }
                ]
            }
        });

        // check elements in the document
        const pageTitle = screen.getByText(/list report quick actions/i);
        expect(pageTitle).toBeInTheDocument();

        // simple quick action
        const quickAction1 = screen.getByRole('button', { name: /quick action 1/i });
        expect(quickAction1).toBeInTheDocument();

        // nested quick action - multiple children
        const quickAction2 = screen.getByRole('button', { name: /quick action 2/i });
        expect(quickAction2).toBeInTheDocument();

        // nested quick action - single child
        const quickAction3 = screen.getByRole('button', { name: /quick action 3/i });
        expect(quickAction3).toBeInTheDocument();

        // simple quick action
        fireEvent.click(quickAction1);
        expect(dispatch).toBeCalledWith(
            executeQuickAction({
                kind: 'simple',
                id: 'quick-action-1'
            })
        );

        // nested quick actions
        fireEvent.click(quickAction2);

        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems.length).toBe(2);

        menuItems.forEach((item, i) => {
            expect(item.getElementsByTagName('span')[0].innerHTML).toBe(children[i].label);
            if (i === 1) {
                item.click();
                const submenuItems = screen.getAllByRole('menuitem');
                [submenuItems[2], submenuItems[3]].forEach((subMenu, i) => {
                    expect(subMenu.getElementsByTagName('span')[0].innerHTML).toBe(children[1].children[i].label);
                });
                fireEvent.click(submenuItems[3]);
                expect(dispatch).toBeCalledWith(
                    executeQuickAction({
                        kind: 'nested',
                        path: '1/1',
                        id: 'quick-action-2'
                    })
                );
            }
        });

        // nested quick action with single child
        fireEvent.click(quickAction3);
        expect(dispatch).toBeCalledWith(
            executeQuickAction({
                kind: 'nested',
                id: 'quick-action-3',
                path: '0'
            })
        );
    });

    test('disable actions in navigation mode', () => {
        const children = [
            {
                label: 'submenu1',
                children: []
            }
        ];

        const { dispatch } = render(<QuickActionList />, {
            initialState: {
                appMode: 'navigation',
                quickActions: [
                    {
                        title: 'List Report',
                        actions: [
                            {
                                id: 'quick-action-1',
                                enabled: true,
                                kind: 'simple',
                                title: 'Quick Action 1'
                            },
                            {
                                id: 'quick-action-2',
                                enabled: true,
                                kind: 'nested',
                                title: 'Quick Action 2',
                                children: children
                            },
                            {
                                id: 'quick-action-3',
                                enabled: true,
                                kind: 'nested',
                                title: 'Quick Action 3',
                                children: [children[0]]
                            }
                        ]
                    }
                ]
            }
        });

        // check elements in the document
        const pageTitle = screen.getByText(/list report quick actions/i);
        expect(pageTitle).toBeInTheDocument();

        // simple quick action
        const quickAction1 = screen.getByRole('button', { name: /quick action 1/i });
        expect(quickAction1).toBeDisabled();

        // nested quick action - multiple children
        const quickAction2 = screen.getByRole('button', { name: /quick action 2/i });
        expect(quickAction2).toBeDisabled();

        // nested quick action - single child
        const quickAction3 = screen.getByRole('button', { name: /quick action 3/i });
        expect(quickAction3).toBeDisabled();
    });
});
