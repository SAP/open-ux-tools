import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';

import { render } from '../../utils';
import { initI18n } from '../../../../src/i18n';
import { mockResizeObserver } from '../../../utils/utils';
import { OutlinePanel } from '../../../../src/panels/outline';
import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import { controlSelected, outlineChanged, SCENARIO } from '@sap-ux-private/control-property-editor-common';
import type { FilterOptions, default as reducer } from '../../../../src/slice';
import { FilterName, filterNodes } from '../../../../src/slice';
import { DeviceType } from '../../../../src/devices';
import { registerAppIcons } from '../../../../src/icons';

export type State = ReturnType<typeof reducer>;

const getModel = (editable = true, visible = true, toggleParent = false, toggleChildren = false): OutlineNode[] => {
    const model: OutlineNode[] = [
        {
            name: 'one',
            controlId: '01',
            children: [
                {
                    name: 'first child of one',
                    controlId: '01-01',
                    children: [],
                    controlType: 'name.space.first.child.one',
                    editable: toggleChildren ? !toggleChildren : editable,
                    visible: toggleChildren ? !toggleChildren : visible
                },
                {
                    name: 'second child of one',
                    controlId: '01-02',
                    children: [],
                    controlType: 'name.space.second.child.one',
                    editable: toggleChildren ? !toggleChildren : editable,
                    visible: toggleChildren ? !toggleChildren : visible
                },
                {
                    name: 'third child of one',
                    controlId: '01-03',
                    children: [],
                    controlType: 'name.space.third.child.one',
                    editable: toggleChildren ? !toggleChildren : editable,
                    visible: toggleChildren ? !toggleChildren : visible
                }
            ],
            controlType: 'name.space.one',
            editable: toggleParent ? !toggleParent : editable,
            visible: toggleParent ? !toggleParent : visible
        },
        {
            name: 'two',
            controlId: '02',
            children: [],
            controlType: 'name.space.two',
            editable: toggleParent ? !toggleParent : editable,
            visible: toggleParent ? !toggleParent : visible
        },
        {
            name: 'SmartTable',
            controlId: '03',
            children: [],
            controlType: 'sap.ui.comp.smarttable.SmartTable',
            editable: toggleParent ? !toggleParent : editable,
            visible: toggleParent ? !toggleParent : visible
        }
    ];
    return model;
};

const filterInitOptions: FilterOptions[] = [
    { name: FilterName.focusEditable, value: false },
    { name: FilterName.focusCommonlyUsed, value: false },
    { name: FilterName.query, value: '' }
];

describe('OutlinePanel', () => {
    beforeAll(() => {
        // Note: The tree is already expanded because we are passing isAllGroupsCollapsed: false
        mockResizeObserver();
        initI18n();
        initIcons();
        registerAppIcons();
    });

    test('initial load', () => {
        const { container } = render(<OutlinePanel />);
        // check search box
        const search = screen.getByRole('searchbox');
        expect(search).toBeInTheDocument();

        const searchbarClassName = container.querySelector('.filter-outline');
        expect(searchbarClassName).toBeInTheDocument();

        // check funnel
        const funnelIcon = container.querySelector('[data-icon-name="funnel"]') as Element;
        expect(funnelIcon).toBeInTheDocument();

        // check no tree is rendered
        const noCtrFoundText = screen.getByText('No control found');
        expect(noCtrFoundText).toHaveTextContent('No control found');
        const modifySearchInputText = screen.getByText('Modify the search input');
        expect(modifySearchInputText).toHaveTextContent('Modify the search input');
        const noSearchMatchedIcon = screen.getByTestId('Control-Property-Editor-No-Search-Matched-Icon');
        expect(noSearchMatchedIcon).toBeInTheDocument();
    });

    test('tree', () => {
        const model = getModel(true, false);
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: model,
            filterQuery: filterInitOptions,
            scenario: SCENARIO.UiAdaptation,
            selectedControl: undefined,
            changes: {
                pending: [],
                saved: [],
                controls: {},
                pendingChangeIds: []
            },
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<OutlinePanel />, { initialState });
        // check one
        const one = screen.getAllByText(/one/i)[0];
        expect(one).toBeInTheDocument();
        // check two
        const two = screen.getByText(/two/i);
        expect(two).toBeInTheDocument();

        // check first child of one
        const firstChildOfOne = screen.getByText(/first child of one/i);
        expect(firstChildOfOne).toBeInTheDocument();
        // check second child of one
        const secondChildOfOne = screen.getByText(/second child of one/i);
        expect(secondChildOfOne).toBeInTheDocument();
    });

    test('query tree', () => {
        const model = getModel(true, false);
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: model,
            filterQuery: filterInitOptions,
            scenario: SCENARIO.UiAdaptation,
            selectedControl: undefined,
            changes: {
                pending: [],
                saved: [],
                controls: {},
                pendingChangeIds: []
            },
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<OutlinePanel />, { initialState });
        const search = screen.getByRole('searchbox');
        // trigger search with query
        fireEvent.change(search, { target: { value: 'second' } });

        // check query value
        expect((search as any).value).toEqual('second');

        // first child of one is filtered
        const firstChildOfOne = screen.queryByText(/first child of one/i);
        expect(firstChildOfOne).toBeNull();

        // second child of one matches query
        const secondChildOfOne = screen.getByText(/second child of one/i);
        expect(secondChildOfOne).toBeInTheDocument();
    });

    test('focus editable controls of tree', () => {
        const model: OutlineNode[] = [
            {
                name: 'one',
                controlId: '01',
                children: [],
                controlType: 'name.space.one',
                editable: false,
                visible: false
            },
            {
                name: 'two',
                controlId: '02',
                children: [],
                controlType: 'name.space.two',
                editable: true,
                visible: false
            }
        ];
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: model,
            filterQuery: filterInitOptions,
            scenario: SCENARIO.UiAdaptation,
            selectedControl: undefined,
            changes: {
                pending: [],
                saved: [],
                controls: {},
                pendingChangeIds: []
            },
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        const { container } = render(<OutlinePanel />, { initialState });
        let focusEditableRow = container.querySelector('.focusEditable');

        // class 'focusEditable' is not set
        expect(focusEditableRow).toBeNull();
        const funnelIcon = container.querySelector('[data-icon-name="funnel"]') as Element;

        // open callout
        fireEvent.click(funnelIcon);
        const focusEditable = screen.getByText(/focus editable/i);

        // click on focus editable checkbox
        fireEvent.click(focusEditable);

        // class 'focusEditable' is set
        focusEditableRow = container.querySelector('.focusEditable');
        expect(focusEditableRow).toBeInTheDocument();
    });

    test('show only commonly used controls of tree', () => {
        const model: OutlineNode[] = [
            {
                name: 'one',
                controlId: '01',
                children: [],
                controlType: 'name.space.one',
                editable: true,
                visible: true
            },
            {
                name: 'two',
                controlId: '02',
                children: [],
                controlType: 'name.space.two',
                editable: false,
                visible: false
            },
            {
                name: 'SmartTable',
                controlId: '03',
                children: [],
                controlType: 'sap.ui.comp.smarttable.SmartTable',
                editable: true,
                visible: true
            }
        ];
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: model,
            filterQuery: filterInitOptions,
            scenario: SCENARIO.UiAdaptation,
            selectedControl: undefined,
            changes: {
                pending: [],
                saved: [],
                controls: {},
                pendingChangeIds: []
            },
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        const { container } = render(<OutlinePanel />, { initialState });
        const funnelIcon = container.querySelector('[data-icon-name="funnel"]') as Element;

        // open callout
        fireEvent.click(funnelIcon);
        const focusCommonlyUsed = screen.getByText(/Show only commonly used/i);

        // click on show hidden checkbox
        fireEvent.click(focusCommonlyUsed);

        // node 'one' and 'two' is filter out
        const one = screen.queryByText(/one/i);
        expect(one).toBeNull();
        const two = screen.queryByText(/two/i);
        expect(two).toBeNull();

        // node 'SmartTable' exists in tree
        const SmartTable = screen.getByText(/SmartTable/i);
        expect(SmartTable).toBeInTheDocument();
    });

    test('handleOpenTooltip should show and hide the tooltip', () => {
        const model: OutlineNode[] = [
            {
                name: 'ExtensionPoint',
                controlId: '04',
                children: [],
                controlType: 'sap.ui.extensionpoint',
                hasDefaultContent: true,
                editable: true,
                visible: true
            }
        ];
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: model,
            filterQuery: filterInitOptions,
            scenario: SCENARIO.AdaptationProject,
            selectedControl: undefined,
            changes: {
                pending: [],
                saved: [],
                controls: {},
                pendingChangeIds: []
            },
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };

        const tooltipId = 'tooltip--ExtensionPoint';

        const { container } = render(<OutlinePanel />, { initialState });
        const spanElement = screen.getByTestId('tooltip-container');

        // Simulate a right-click event
        fireEvent.contextMenu(spanElement);

        const tooltip = container.querySelector(`#${tooltipId}`);

        expect(tooltip).toHaveStyle({ visibility: 'visible', opacity: '1' });

        // Close the tooltip
        fireEvent.click(document); // Simulate a click outside the tooltip

        expect(tooltip).toHaveStyle({ visibility: 'hidden', opacity: '0' });
    });

    test('should show and hide tooltip when clicking button to open dialog', () => {
        const model: OutlineNode[] = [
            {
                name: 'ExtensionPoint',
                controlId: '04',
                children: [],
                controlType: 'sap.ui.extensionpoint',
                editable: true,
                visible: true
            }
        ];
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: model,
            filterQuery: filterInitOptions,
            scenario: SCENARIO.AdaptationProject,
            selectedControl: undefined,
            changes: {
                pending: [],
                saved: [],
                controls: {},
                pendingChangeIds: []
            },
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };

        const tooltipId = 'tooltip--ExtensionPoint';

        const { container } = render(<OutlinePanel />, { initialState });
        const spanElement = screen.getByTestId('tooltip-container');
        const buttonElement = screen.getByTestId('tooltip-dialog-button');

        // Simulate a right-click event
        fireEvent.contextMenu(spanElement);

        const tooltip = container.querySelector(`#${tooltipId}`);

        expect(tooltip).toHaveStyle({ visibility: 'visible', opacity: '1' });

        // Close the tooltip
        fireEvent.click(buttonElement); // Simulate a click on the tooltip button

        expect(tooltip).toHaveStyle({ visibility: 'hidden', opacity: '0' });
    });

    test('should hide tooltip if another tooltip is already open', () => {
        const model: OutlineNode[] = [
            {
                name: 'one',
                controlId: '01',
                children: [
                    {
                        name: 'ExtensionPoint',
                        controlId: '04',
                        children: [],
                        controlType: 'sap.ui.extensionpoint',
                        editable: true,
                        visible: true
                    },
                    {
                        name: 'ExtensionPoint2',
                        controlId: '05',
                        children: [],
                        controlType: 'sap.ui.extensionpoint',
                        editable: true,
                        visible: true
                    }
                ],
                controlType: 'name.space.one',
                editable: true,
                visible: true
            }
        ];
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: model,
            filterQuery: filterInitOptions,
            scenario: SCENARIO.AdaptationProject,
            selectedControl: undefined,
            changes: {
                pending: [],
                saved: [],
                controls: {},
                pendingChangeIds: []
            },
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };

        const tooltipId = 'tooltip--ExtensionPoint';
        const tooltipId2 = 'tooltip--ExtensionPoint2';

        const { container } = render(<OutlinePanel />, { initialState });
        const spanElements = screen.getAllByTestId('tooltip-container'); // Array of three items

        // Simulate a right-click event
        fireEvent.contextMenu(spanElements[1]);
        fireEvent.contextMenu(spanElements[2]);

        const tooltip = container.querySelector(`#${tooltipId}`);
        const tooltip2 = container.querySelector(`#${tooltipId2}`);

        expect(tooltip).toHaveStyle({ visibility: 'hidden', opacity: '0' });
        expect(tooltip2).toHaveStyle({ visibility: 'visible', opacity: '1' });
    });

    test('do not expand to previously selected control', () => {
        const { store, container } = render(<OutlinePanel />);
        // clear default applied filters
        const action = filterNodes([
            { name: FilterName.focusEditable, value: false },
            { name: FilterName.focusCommonlyUsed, value: false }
        ]);
        store.dispatch(action);
        const model = getModel(true, false);
        store.dispatch(outlineChanged(model));

        // select node
        screen.getByText(/second child of one/i).click();
        store.dispatch(controlSelected({ id: '01-02', type: '', properties: [], name: 'testing1' }));

        // collapse first node
        const arrowRight = container.querySelector('[data-icon-name="Chevron"]') as Element;
        fireEvent.click(arrowRight);

        // select outer node
        screen.getByText(/two/i).click();
        store.dispatch(controlSelected({ id: '02', type: '', properties: [], name: 'testing2' }));
        expect(screen.queryByText(/second child of one/i)).toBeNull();
    });

    test('updateSelectionFromPreview', () => {
        const { store } = render(<OutlinePanel />);
        // clear default applied filters
        const action = filterNodes([
            { name: FilterName.focusEditable, value: true },
            { name: FilterName.focusCommonlyUsed, value: false }
        ]);
        store.dispatch(action);
        const model = getModel(true, false);
        store.dispatch(outlineChanged(model));

        // select child node
        screen.getByText(/second child of one/i).click();
        let selectControl = { id: '01-03', type: '', properties: [], name: 'testing3' };
        store.dispatch(controlSelected(selectControl));
        let expectedControl = store.getState().selectedControl;
        expect(expectedControl).toEqual(selectControl);

        // select outer node
        screen.getByText(/two/i).click();
        selectControl = { id: '03', type: '', properties: [], name: 'testing4' };
        store.dispatch(controlSelected(selectControl));
        expectedControl = store.getState().selectedControl;
        expect(expectedControl).toEqual(selectControl);
    });

    test('show change indicator', () => {
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: getModel(true, true, true, true),
            filterQuery: filterInitOptions,
            scenario: SCENARIO.UiAdaptation,
            selectedControl: undefined,
            changes: {
                pending: [],
                saved: [],
                controls: {
                    '01': {
                        pending: 0,
                        saved: 1,
                        properties: {},
                        controlName: 'test01'
                    },
                    '01-01': {
                        pending: 0,
                        saved: 1,
                        properties: {},
                        controlName: 'test01-01'
                    }
                },
                pendingChangeIds: []
            },
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false,
            appMode: 'adaptation',
            canSave: false,
            changeStack: { canRedo: false, canUndo: false },
            isAppLoading: true
        };
        const { container } = render(<OutlinePanel />, { initialState });

        const arrowRight = container.querySelector('[data-icon-name="Chevron"]') as Element;
        expect(arrowRight).toBeInTheDocument();

        const indicator = container.querySelectorAll('svg circle');
        expect(indicator).toHaveLength(2);
    });
});
