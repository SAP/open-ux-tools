import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { UIIContextualMenuProps } from '../../../src/components/UIContextualMenu';
import { UIContextualMenu } from '../../../src/components/UIContextualMenu';
import { ContextualMenu } from '@fluentui/react';
import { initIcons } from '../../../src/components/Icons';

describe('<UIDropdown />', () => {
    let wrapper: Enzyme.ReactWrapper<UIIContextualMenuProps>;
    initIcons();

    beforeEach(() => {
        wrapper = Enzyme.mount(
            <UIContextualMenu
                items={[
                    {
                        key: 'item1',
                        text: 'menu item 1'
                    },
                    {
                        key: 'item2',
                        text: 'menu item 2'
                    }
                ]}
            />
        );
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Existence', () => {
        expect(wrapper.find('div.ts-ContextualMenu').length).toEqual(1);
    });

    it('Test className property', () => {
        expect(wrapper.find(ContextualMenu).prop('className')).toEqual('ts-ContextualMenu');
        wrapper.setProps({
            className: 'dummy'
        });
        expect(wrapper.find(ContextualMenu).prop('className')).toEqual('ts-ContextualMenu dummy');
    });
});
