import React from 'react';
import { screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';

import { render } from './utils';
import { initI18n } from '../../../src/app/i18n';

import App from '../../../src/app/App';
import { controlSelected } from '@sap-ux/control-property-editor-common';
import { mockResizeObserver } from '../../utils/utils';
import { InputType } from '../../../src/app/panels/properties/types';
import { registerAppIcons } from '../../../src/app/icons';

beforeAll(() => {
    mockResizeObserver();
    initI18n();
    registerAppIcons();
    initIcons();
    // JSDom does not implement this and an error was being
    // thrown from jest-axe because of it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-empty-function
    (window as any).getComputedStyle = (): void => {};
});

test('renders empty properties panel', () => {
    render(<App previewUrl="" />);
    const noControlSelected = screen.getByText(/No control selected/i);
    expect(noControlSelected).toBeInTheDocument();

    const selectControlText = screen.getByText(/Select a control on the canvas to see and modify its properties/i);
    expect(selectControlText).toBeInTheDocument();

    const controlSelectIcon = screen.getByTestId('Control-Property-Editor-No-Control-Selected');
    expect(controlSelectIcon).toBeInTheDocument();
});

test('renders properties', () => {
    const { store } = render(<App previewUrl="" />);
    const propNameString = 'activeIcon';
    const propNameDropDown = 'ariaHasPopup';
    const propNameCheckbox = 'visible';
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
                    isEnabled: true
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

    let notFoundException = null;
    try {
        screen.getByTestId(`${propNameCheckbox}--StringEditor`);
    } catch (e) {
        notFoundException = e;
    }
    expect(notFoundException).toBeTruthy();
});

test('renders warning dialog', () => {
    render(<App previewUrl="" />);
    const dialogContent = screen.getByText(
        /The Control Property Editor enables you to change control properties and behavior directly. These changes may not have the desired effect with Fiori elements applications. Please consult documentation to learn which changes are supported./i
    );
    expect(dialogContent).toBeInTheDocument();
});
