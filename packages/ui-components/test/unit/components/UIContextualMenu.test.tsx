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

    for (const testMaxWidth of [350, undefined]) {
        it('Styles', () => {
            wrapper.setProps({
                maxWidth: testMaxWidth
            });
            const calloutProps = wrapper.find(ContextualMenu).prop('calloutProps');
            expect(calloutProps?.styles).toEqual({
                root: {
                    maxWidth: testMaxWidth,
                    backgroundColor: 'transparent',
                    borderRadius: 4,
                    boxShadow: 'var(--ui-box-shadow-small)'
                },
                beak: {
                    backgroundColor: 'var(--vscode-editorWidget-background)',
                    boxShadow: 'var(--ui-box-shadow-small)'
                },
                beakCurtain: {
                    backgroundColor: 'var(--vscode-editorWidget-background)',
                    borderRadius: 4
                }
            });
        });
    }

    it('iconToLeft prop', () => {
        wrapper.setProps({
            items: [
                {
                    key: 'item1',
                    text: 'menu item 1',
                    subMenuProps: {
                        items: [{
                            key: 'item1',
                            text: 'item 1 - submenu1',
                        }]
                    }
                },
                {
                    key: 'item2',
                    text: 'menu item 2'
                }
            ],
            iconToLeft: true
        });
        wrapper.update();
        //Check if submenu icon is rendered
        // Check if icon is on left side

        const containerElements = wrapper.find('.ms-ContextualMenu-linkContent');
        containerElements.forEach((containerElement, index) => {
            const textElement = containerElement.find('.ms-ContextualMenu-itemText').getDOMNode();
            if (index === 0) {
                const iconElement = containerElement.find('i.ms-ContextualMenu-submenuIcon').getDOMNode();
                expect(containerElement.getDOMNode().childNodes[0]).toBe(iconElement);
                expect(containerElement.getDOMNode().childNodes[1]).toBe(textElement);
            } else {
                expect(containerElement.getDOMNode().childNodes[0]).toBe(textElement);
            }
        })
        
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

    it('Test mexture menu - item with icon and item without icon', () => {
        wrapper.setProps({
            items: [
                {
                    key: 'item1',
                    text: 'menu item 1'
                },
                {
                    key: 'item2',
                    iconProps: {
                        iconName: UiIcons.GuidedDevelopment
                    },
                    text: 'menu item 2'
                }
            ]
        });
        wrapper.update();
        //Check if only one icon is rendered
        expect(wrapper.find(`i[data-icon-name="${UiIcons.GuidedDevelopment}"]`).length).toEqual(1);
        // Check if two menu items are rendered
        expect(wrapper.find('.ms-ContextualMenu-linkContent').length).toEqual(2);
    });
});
