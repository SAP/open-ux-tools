import * as React from 'react';
import * as Enzyme from 'enzyme';
import { UISearchBox } from '../../../src/components/UISearchBox/UISearchBox';
import type { ISearchBoxProps } from '@fluentui/react';

describe('<UISearchBox />', () => {
    let wrapper: Enzyme.ReactWrapper<ISearchBoxProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UISearchBox />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Existence', () => {
        expect(wrapper.find(UISearchBox).length).toEqual(1);
    });

    it('Test callbacks - onChange and onClear', () => {
        const expectQuery = 'dummy';
        const onChange = jest.fn();
        const onClear = jest.fn();
        wrapper.setProps({
            onChange,
            onClear
        });
        wrapper.find('UISearchBox input').simulate('change', {
            target: {
                value: expectQuery
            }
        });
        expect(onChange).toBeCalledTimes(1);
        expect(onChange.mock.calls[0][1]).toEqual(expectQuery);

        // Check reset
        onChange.mockClear();
        const resetButton = wrapper.find('UISearchBox button.ms-Button');
        expect(resetButton.length).toEqual(1);

        resetButton.simulate('click', {});
        expect(onChange).toBeCalledTimes(1);
        expect(onChange.mock.calls[0][1]).toEqual('');
        expect(onClear).toBeCalledTimes(1);
    });
});
