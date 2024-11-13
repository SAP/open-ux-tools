import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import { render, mockDomEventListener } from './utils';

import App from '../../src/App';
import { controlSelected, PropertyType, SCENARIO } from '@sap-ux-private/control-property-editor-common';

import { InputType } from '../../src/panels/properties/types';
import { DeviceType } from '../../src/devices';
import { changePreviewScale } from '../../src/slice';

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
            name: 'controlName',
            properties: [
                {
                    type: 'string',
                    editor: 'input',
                    name: propNameString,
                    value: '',
                    isEnabled: true,
                    readableName: '',
                    propertyType: PropertyType.ControlProperty
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
                    ],
                    propertyType: PropertyType.ControlProperty
                },
                {
                    type: 'boolean',
                    editor: 'checkbox',
                    name: propNameCheckbox,
                    value: true,
                    isEnabled: true,
                    readableName: 'test check',
                    propertyType: PropertyType.ControlProperty
                },
                {
                    type: 'string',
                    editor: 'dropdown',
                    options: [],
                    name: propNameDropDownExpression,
                    value: '{ dropDownDynamicExpression }',
                    isEnabled: true,
                    readableName: '',
                    propertyType: PropertyType.ControlProperty
                },
                {
                    type: 'boolean',
                    editor: 'checkbox',
                    name: propNameCheckboxExpression,
                    isEnabled: true,
                    value: '{ checkBoxDynamicExpression }',
                    readableName: 'test check dynamic expression',
                    propertyType: PropertyType.ControlProperty
                },
                {
                    type: 'string',
                    editor: 'unknown',
                    name: 'unknownprop',
                    isEnabled: true,
                    value: 'checkBoxDynamicExpression',
                    readableName: 'test check dynamic expression',
                    propertyType: PropertyType.ControlProperty
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
    render(<App previewUrl="" scenario="FE_FROM_SCRATCH" />);
    const dialogContent = screen.getByText(
        /The Control Property Editor enables you to change control properties and behavior directly. These changes may not have the desired effect with Fiori elements applications. Please consult documentation to learn which changes are supported./i
    );
    expect(dialogContent).toBeInTheDocument();
    const okButton = screen.getByText(/ok/i);
    expect(okButton).toBeInTheDocument();
    fireEvent.click(okButton);
});

test('renders warning message for "ADAPTATION_PROJECT" scenario', async () => {
    const { rerender, store } = render(<App previewUrl="" scenario="ADAPTATION_PROJECT" />, {
        initialState: {
            scenario: SCENARIO.AdaptationProject,
            isAdpProject: true,
            dialogMessage: {
                message: 'Some Text',
                shouldHideIframe: false
            }
        }
    });

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

    notFoundException = undefined;
    const state = store.getState();
    state.dialogMessage = { message: 'Other Text', shouldHideIframe: false };
    rerender(<App previewUrl="" scenario="ADAPTATION_PROJECT" />);
    try {
        screen.getByText(/Other Text/i);
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

describe('Test resize', () => {
    const windowEventListenerMock = mockDomEventListener(window);
    beforeAll(() => {
        jest.useFakeTimers({ advanceTimers: true });
    });

    for (const testCase of testCases) {
        test(`fitPreview=true, device=${testCase.deviceType}`, async () => {
            const { dispatch } = render(<App previewUrl="" scenario={SCENARIO.FioriElementsFromScratch} />, {
                initialState: {
                    fitPreview: true,
                    deviceType: testCase.deviceType
                }
            });
            global.window.innerWidth = 111;
            global.window.innerHeight = 2222;

            jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 500);
            act(() => {
                windowEventListenerMock.simulateEvent('resize', {});
                // Debounce timeout within resize + within use effect
                jest.advanceTimersByTime(3000);
                expect(dispatch).toBeCalledWith(changePreviewScale(testCase.expectedScale));
            });
        });
    }
});
