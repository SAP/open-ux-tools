import React from 'react';
import * as Enzyme from 'enzyme';

import type { UICreateSelectOptionEntry, UICreateSelectProps } from '../../../src/components/UICreateSelect';
import { UICreateSelect } from '../../../src/components/UICreateSelect';

describe('<UICreateSelect />', () => {
    const createOption = (label: string) => ({
        label,
        value: label.toLowerCase().replace(/\W/g, '')
    });
    const defaultOptions = [createOption('One'), createOption('Two'), createOption('Three')];
    const isLoading = false;
    const options = defaultOptions;
    const value = {} as UICreateSelectOptionEntry;
    const handleCreate = jest.fn();
    const handleChange = jest.fn();

    let wrapper: Enzyme.ReactWrapper<UICreateSelectProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(
            <UICreateSelect
                createText={'Add new value'}
                isClearable={true}
                isLoading={isLoading}
                isDisabled={false}
                placeholder={'Search or enter a new value'}
                options={options}
                value={value}
                handleCreate={handleCreate}
                handleOnChange={handleChange}
            />
        );
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Existence', () => {
        expect(wrapper.find(UICreateSelect).length).toEqual(1);
    });
});
