import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { UIIContextualMenuProps } from '../../../src/components/UIContextualMenu';
import { UIContextualMenu } from '../../../src/components/UIContextualMenu';
import { ContextualMenu } from '@fluentui/react';
import { UiIcons, initIcons } from '../../../src/components/Icons';

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

    it('Test item with icon', () => {
        wrapper.setProps({
            items: [
                {
                    key: 'item1',
                    iconProps: {
                        iconName: UiIcons.GuidedDevelopment
                    },
                    text: 'menu item 1'
                }
            ]
        });
        wrapper.update();
        //Check if icon is rendered
        expect(wrapper.find(`i[data-icon-name="${UiIcons.GuidedDevelopment}"]`).length).toEqual(1);
        // Check if icon is on right side
        const containerElement = wrapper.find('.ms-ContextualMenu-linkContent').getDOMNode();
        const textElement = wrapper.find('.ms-ContextualMenu-itemText').getDOMNode();
        const iconElement = wrapper.find('i.ms-ContextualMenu-icon').getDOMNode();
        expect(containerElement.childNodes[0]).toBe(textElement);
        expect(containerElement.childNodes[1]).toBe(iconElement);
    });
});
