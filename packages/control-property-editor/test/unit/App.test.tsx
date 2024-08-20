import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';

import { render, mockDomEventListener } from './utils';
import { initI18n } from '../../src/i18n';

import App from '../../src/App';
import { controlSelected, SCENARIO } from '@sap-ux-private/control-property-editor-common';
import { mockResizeObserver } from '../utils/utils';
import { InputType } from '../../src/panels/properties/types';
import { registerAppIcons } from '../../src/icons';
import { DeviceType } from '../../src/devices';
import { FilterName, changePreviewScale, initialState } from '../../src/slice';

jest.useFakeTimers({ advanceTimers: true });
const windowEventListenerMock = mockDomEventListener(window);
beforeAll(() => {
    mockResizeObserver();
    initI18n();
    registerAppIcons();
    initIcons();
    // JSDom does not implement this and an error was being
    // thrown from jest-axe because of it.
    (window as any).getComputedStyle = jest.fn();
});

test('renders empty properties panel', () => {
    render(<App previewUrl="" scenario={SCENARIO.FioriElementsFromScratch} />);
    const noControlSelected = screen.getByText(/No control selected/i);
    expect(noControlSelected).toBeInTheDocument();

    const selectControlText = screen.getByText(/Select a control on the canvas to see and modify its properties/i);
    expect(selectControlText).toBeInTheDocument();

    const controlSelectIcon = screen.getByTestId('Control-Property-Editor-No-Control-Selected');
    expect(controlSelectIcon).toBeInTheDocument();
});

test('renders properties', () => {
    const { store } = render(<App previewUrl="" scenario={SCENARIO.FioriElementsFromScratch} />);
    const propNameString = 'activeIcon';
    const propNameDropDown = 'ariaHasPopup';
    const propNameCheckbox = 'visible';
    const propNameCheckboxExpression = 'random';
    const propNameDropDownExpression = 'sync';
    store.dispatch(
        controlSelected({
            id: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
            type: 'sap.m.Button',
            properties: [
                {
                    type: 'string',
                    editor: 'input',
                    name: propNameString,
                    value: '',
                    isEnabled: true,
                    readableName: ''
                },
                {
                    type: 'string',
                    editor: 'dropdown',
                    name: propNameDropDown,
                    value: 'None',
                    isEnabled: true,
                    readableName: '',
                    options: [
                        {
                            key: 'None',
                            text: 'None'
                        },
                        {
                            key: 'Menu',
                            text: 'Menu'
                        },
                        {
                            key: 'ListBox',
                            text: 'ListBox'
                        },
                        {
                            key: 'Tree',
                            text: 'Tree'
                        },
                        {
                            key: 'Grid',
                            text: 'Grid'
                        },
                        {
                            key: 'Dialog',
                            text: 'Dialog'
                        }
                    ]
                },
                {
                    type: 'boolean',
                    editor: 'checkbox',
                    name: propNameCheckbox,
                    value: true,
                    isEnabled: true,
                    readableName: 'test check'
                },
                {
                    type: 'string',
                    editor: 'dropdown',
                    options: [],
                    name: propNameDropDownExpression,
                    value: '{ dropDownDynamicExpression }',
                    isEnabled: true,
                    readableName: ''
                },
                {
                    type: 'boolean',
                    editor: 'checkbox',
                    name: propNameCheckboxExpression,
                    isEnabled: true,
                    value: '{ checkBoxDynamicExpression }',
                    readableName: 'test check dynamic expression'
                },
                {
                    type: 'string',
                    editor: 'unknown',
                    name: 'unknownprop',
                    isEnabled: true,
                    value: 'checkBoxDynamicExpression',
                    readableName: 'test check dynamic expression'
                }
            ]
        })
    );
    const visiblePropertyLabel = screen.getByTestId(`${propNameCheckbox}--Label`);
    expect(visiblePropertyLabel).toBeInTheDocument();

    const buttonTrue = screen.getByTestId(`${propNameCheckbox}--InputTypeToggle--${InputType.booleanTrue}`);
    expect(buttonTrue.getAttribute('aria-pressed')).toBe('true');
    expect(buttonTrue).toBeInTheDocument();

    const buttonFalse = screen.getByTestId(`${propNameCheckbox}--InputTypeToggle--${InputType.booleanFalse}`);
    expect(buttonFalse.getAttribute('aria-pressed')).toBe('false');
    expect(buttonFalse).toBeInTheDocument();

    const buttonExpression = screen.getByTestId(`${propNameCheckbox}--InputTypeToggle--${InputType.expression}`);
    expect(buttonExpression.getAttribute('aria-pressed')).toBe('false');
    expect(buttonExpression).toBeInTheDocument();

    const dropdownButtonExp2 = screen.getByTestId(
        `${propNameDropDownExpression}--InputTypeToggle--${InputType.expression}`
    );
    expect(dropdownButtonExp2.getAttribute('aria-pressed')).toBe('true');
    expect(dropdownButtonExp2).toBeInTheDocument();

    const checkButtonExp2 = screen.getByTestId(
        `${propNameCheckboxExpression}--InputTypeToggle--${InputType.expression}`
    );
    expect(checkButtonExp2.getAttribute('aria-pressed')).toBe('true');
    expect(checkButtonExp2).toBeInTheDocument();

    let notFoundException = null;
    try {
        screen.getByTestId(`${propNameCheckbox}--StringEditor`);
    } catch (e) {
        notFoundException = e;
    }
    expect(notFoundException).toBeTruthy();
});

test('does not render warning dialog', async () => {
    render(<App previewUrl="" scenario={SCENARIO.AdaptationProject} />);
    const dialogContent = screen.queryByText(
        /The Control Property Editor enables you to change control properties and behavior directly. These changes may not have the desired effect with Fiori elements applications. Please consult documentation to learn which changes are supported./i
    );
    expect(dialogContent).not.toBeInTheDocument();
});

test('renders warning dialog for "FE_FROM_SCRATCH" scenario', async () => {
    render(<App previewUrl="" scenario="FE_FROM_SCRATCH" />, { initialState });
    const dialogContent = screen.getByText(
        /The Control Property Editor enables you to change control properties and behavior directly. These changes may not have the desired effect with Fiori elements applications. Please consult documentation to learn which changes are supported./i
    );
    expect(dialogContent).toBeInTheDocument();
    const okButton = screen.getByText(/ok/i);
    expect(okButton).toBeInTheDocument();
    fireEvent.click(okButton);
});

test('renders warning message for "ADAPTATION_PROJECT" scenario', async () => {
    const initialState = {
        deviceType: DeviceType.Desktop,
        scale: 1.0,
        selectedControl: undefined,
        outline: [],
        filterQuery: [
            { name: FilterName.focusEditable, value: true },
            { name: FilterName.focusCommonlyUsed, value: true },
            { name: FilterName.query, value: '' },
            { name: FilterName.changeSummaryFilterQuery, value: '' },
            { name: FilterName.showEditableProperties, value: true }
        ],
        scenario: SCENARIO.AdaptationProject,
        isAdpProject: true,
        icons: [],
        changes: {
            controls: {},
            pending: [],
            saved: [],
            pendingChangeIds: []
        },
        dialogMessage: {
            message: 'Some Text',
            shouldHideIframe: false
        },
        changeStack: {
            canUndo: true,
            canRedo: true
        },
        quickActions: [],
        canSave: true
    };
    render(<App previewUrl="" scenario="ADAPTATION_PROJECT" />, { initialState });

    const warningDialog = screen.getByText(/Some Text/i);
    expect(warningDialog).toBeInTheDocument();
    const okButton = screen.getByText(/ok/i);
    expect(okButton).toBeInTheDocument();
    fireEvent.click(okButton);
    let notFoundException = null;
    try {
        screen.getByText(/Some Text/i);
    } catch (e) {
        notFoundException = e;
    }
    expect(notFoundException).toBeTruthy();
});

const testCases = [
    {
        deviceType: DeviceType.Desktop,
        expectedScale: 460 / 1200
    },
    {
        deviceType: DeviceType.Tablet,
        expectedScale: 460 / 720
    }
];

for (const testCase of testCases) {
    test(`Test resize - fitPreview=true, device=${testCase.deviceType}`, async () => {
        const stateTemp = JSON.parse(JSON.stringify(initialState));
        stateTemp.fitPreview = true;
        stateTemp.deviceType = testCase.deviceType;

        const { dispatch } = render(<App previewUrl="" scenario={SCENARIO.FioriElementsFromScratch} />, {
            initialState: stateTemp
        });
        await new Promise((resolve) => setTimeout(resolve, 1));
        global.window.innerWidth = 111;
        global.window.innerHeight = 2222;
        dispatch.mockReset();
        jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 500);
        windowEventListenerMock.simulateEvent('resize', {});
        // Debounce timeout within resize + within use effect
        jest.advanceTimersByTime(3000);
        expect(dispatch).toBeCalledWith(changePreviewScale(testCase.expectedScale));
    });
}
