import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';

import { render } from '../../utils';
import { FilterName } from '../../../../src/slice';
import type { FilterOptions, ChangesSlice, default as reducer } from '../../../../src/slice';
import { DeviceType } from '../../../../src/devices';
import { registerAppIcons } from '../../../../src/icons';
import { initI18n } from '../../../../src/i18n';
import { executeQuickAction } from '@sap-ux-private/control-property-editor-common';
import { QuickActionList } from '../../../../src/panels/quick-actions';

export type State = ReturnType<typeof reducer>;

const getEmptyModel = (): ChangesSlice => {
    const model: ChangesSlice = {
        controls: {} as any,
        pending: [],
        saved: [],
        pendingChangeIds: []
    };
    return model;
};

describe('QuickActionList', () => {
    beforeAll(() => {
        initI18n();
        initIcons();
        registerAppIcons();
    });
    test('ChangePanel - check if quick action list rendered', () => {
        const model = getEmptyModel();
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
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: [],
            selectedControl: undefined,
            changes: model,
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false,
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
        };
        const { dispatch } = render(<QuickActionList />, { initialState });

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
        const quickAction3 = screen.getByRole('button', { name: /quick action 3 - submenu1/i });
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
});
