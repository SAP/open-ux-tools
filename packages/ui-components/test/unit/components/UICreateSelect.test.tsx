import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { RenderResult } from '@testing-library/react';

import { initIcons, UICreateSelect } from '../../../src/components';
import type { UICreateSelectProps } from '../../../src/components';

describe('<UICreateSelect />', () => {
    initIcons();

    const createOption = (label: string) => ({
        label,
        value: label.toLowerCase().replace(/\W/g, '')
    });
    const defaultOptions = [createOption('One'), createOption('Two'), createOption('Three')];
    const renderUICreateSelect = (props: UICreateSelectProps): RenderResult =>
        render(
            <UICreateSelect
                defaultMenuIsOpen={props.defaultMenuIsOpen}
                createText={props.createText}
                isClearable={props.isClearable}
                isLoading={props.isLoading}
                isDisabled={props.isDisabled}
                isValidNewOption={props.isValidNewOption}
                placeholder={props.placeholder}
                options={props.options}
                value={props.value}
                handleCreate={props.handleCreate}
                handleOnChange={props.handleOnChange}
            />
        );

    const clickDropdown = (element: Element) => {
        element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };

    it('Render a UICreateSelect component', () => {
        const props: UICreateSelectProps = {
            createText: 'Add new value',
            isClearable: true,
            isLoading: false,
            isDisabled: false,
            isValidNewOption: jest.fn(),
            placeholder: 'Search or enter a new value',
            options: defaultOptions,
            value: undefined,
            handleCreate: jest.fn(),
            handleOnChange: jest.fn()
        };
        renderUICreateSelect(props);

        const placeholder = screen.getByText('Search or enter a new value');
        expect(placeholder.className).toContain('ui-create-select__placeholder');
    });

    it('Render a UICreateSelect component with default value', () => {
        const props: UICreateSelectProps = {
            createText: 'Add new value',
            isClearable: true,
            isLoading: false,
            isDisabled: false,
            isValidNewOption: jest.fn(),
            placeholder: 'Search or enter a new value',
            options: defaultOptions,
            value: defaultOptions[1],
            handleCreate: jest.fn(),
            handleOnChange: jest.fn()
        };
        const { container } = renderUICreateSelect(props);

        const value = screen.getByText(defaultOptions[1].label);
        expect(value.className).toContain('ui-create-select__single-value');

        // we should have a clear icon
        expect(container.querySelectorAll('.ui-create-select-indicator-clear').length).toEqual(1);
    });

    it('Render a UICreateSelect component with default value and loading', () => {
        const props: UICreateSelectProps = {
            createText: 'Add new value',
            isClearable: true,
            isLoading: true,
            isDisabled: false,
            isValidNewOption: jest.fn(),
            placeholder: 'Search or enter a new value',
            options: defaultOptions,
            value: defaultOptions[1],
            handleCreate: jest.fn(),
            handleOnChange: jest.fn()
        };
        const { container } = renderUICreateSelect(props);

        const value = screen.getByText(defaultOptions[1].label);
        expect(value.className).toContain('ui-create-select__single-value');

        // we should have a loading icon
        expect(container.querySelectorAll('.ui-create-select-indicator-loading').length).toEqual(1);
    });

    it('Render a UICreateSelect component and open the menu', () => {
        const props: UICreateSelectProps = {
            defaultMenuIsOpen: true,
            createText: 'Add new value',
            isClearable: true,
            isLoading: true,
            isDisabled: false,
            isValidNewOption: jest.fn(),
            placeholder: 'Search or enter a new value',
            options: defaultOptions,
            value: defaultOptions[1],
            handleCreate: jest.fn(),
            handleOnChange: jest.fn()
        };
        const { container } = renderUICreateSelect(props);

        const dropElt = container.querySelectorAll('.ui-create-select__dropdown-indicator');
        expect(dropElt.length).toEqual(1);

        clickDropdown(dropElt[0]);

        const menuOptions = container.querySelectorAll('.ts-Menu-option');
        expect(menuOptions.length).toEqual(3);
    });
});
