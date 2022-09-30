import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { UIHighlightMenuOptionProps } from '../../../src/components/UIContextualMenu/UIHighlightMenuOption';
import { UIHighlightMenuOption } from '../../../src/components/UIContextualMenu/UIHighlightMenuOption';

describe('<UIHighlightMenuOption />', () => {
    let wrapper: Enzyme.ReactWrapper<UIHighlightMenuOptionProps>;
    const hidlightSelector = '.ts-Menu-option--highlighted';

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIHighlightMenuOption text="" />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a ComboboxSearchOption component', () => {
        const text = 'Dummy Text';
        wrapper.setProps({
            text
        });
        expect(wrapper.find('.ts-Menu-option').text()).toEqual(text);
    });

    it('Check search highlighting', () => {
        const text = 'Test query 12321';
        // Single occureance
        let query = 'q';
        wrapper.setProps({
            text,
            query
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(1);
        expect(wrapper.find(hidlightSelector).text()).toEqual(query);
        // Multiple occureance
        wrapper.setProps({
            query: 'e'
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(2);
        // One larger query
        query = 'er';
        wrapper.setProps({
            query
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(1);
        expect(wrapper.find(hidlightSelector).text()).toEqual(query);
        // Case insensitive
        wrapper.setProps({
            query: 'EST'
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(1);
        expect(wrapper.find(hidlightSelector).text()).toEqual('est');
        // Beginning
        wrapper.setProps({
            query: 'te'
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(1);
        expect(wrapper.find(hidlightSelector).text()).toEqual('Te');
        // Ending
        wrapper.setProps({
            query: '21'
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(1);
        // No occureance
        wrapper.setProps({
            query: '404'
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(0);
    });

    it('Continues occuriences - same combination', () => {
        const text = 'Dummmmmmmmyyyyyy';
        const query = 'mm';
        wrapper.setProps({
            text,
            query
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(4);
    });

    it('Continues occuriences - different combination', () => {
        const text = 'Dudududummy';
        let query = 'du';
        wrapper.setProps({
            text,
            query
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(4);
        // Append more
        query = 'dud';
        wrapper.setProps({
            query
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(2);
        // Append one more
        query = 'dudu';
        wrapper.setProps({
            query
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(2);
        // And one more
        query = 'dudud';
        wrapper.setProps({
            query
        });
        expect(wrapper.find(hidlightSelector).length).toEqual(1);
    });
});
