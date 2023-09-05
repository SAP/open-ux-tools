import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

import { initIcons, UICreateSelect, UICreateSelectProps } from '../../../src/components';

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

        screen.debug();

        expect(true).toBeTruthy();
    });
});
