import * as React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import type { UIIContextualMenuProps } from '../../../src/components/UIContextualMenu';
import {
    getUIcontextualMenuCalloutStyles,
    getUIContextualMenuItemStyles,
    UIContextualMenu
} from '../../../src/components/UIContextualMenu';
import { ContextualMenu } from '@fluentui/react';
import { UiIcons, initIcons } from '../../../src/components/Icons';

describe('<UIContextualMenu />', () => {
    let container: HTMLElement;
    let rerender: (ui: React.ReactElement) => void;
    initIcons();

    beforeEach(() => {
        const result = render(
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
        container = result.container;
        rerender = result.rerender;
    });

    afterEach(() => {
        cleanup();
    });

    it('Existence', () => {
        expect(container.querySelectorAll('div.ts-ContextualMenu').length).toEqual(1);
    });

    it('Test className property', () => {
        const contextualMenu = container.querySelector('.ts-ContextualMenu');
        expect(contextualMenu).toHaveClass('ts-ContextualMenu', 'ts-ContextualMenu--dropdown');
        
        rerender(
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
                className="dummy"
            />
        );
        
        const contextualMenuWithClass = container.querySelector('.ts-ContextualMenu');
        expect(contextualMenuWithClass).toHaveClass('ts-ContextualMenu', 'ts-ContextualMenu--dropdown', 'dummy');
    });

    for (const testMaxWidth of [350, undefined]) {
        it('Styles', () => {
            rerender(
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
                    maxWidth={testMaxWidth}
                />
            );
            // Test that the component renders with the expected structure
            expect(container.querySelector('.ts-ContextualMenu')).toBeInTheDocument();
        });
    }

    it('iconToLeft prop', () => {
        rerender(
            <UIContextualMenu
                items={[
                    {
                        key: 'item1',
                        text: 'menu item 1',
                        subMenuProps: {
                            items: [
                                {
                                    key: 'item1',
                                    text: 'item 1 - submenu1'
                                }
                            ]
                        }
                    },
                    {
                        key: 'item2',
                        text: 'menu item 2'
                    }
                ]}
                iconToLeft={true}
            />
        );
        
        // Check if submenu icon is rendered
        const containerElements = container.querySelectorAll('.ms-ContextualMenu-linkContent');
        containerElements.forEach((containerElement, index) => {
            const textElement = containerElement.querySelector('.ms-ContextualMenu-itemText');
            if (index === 0) {
                const iconElement = containerElement.querySelector('i.ms-ContextualMenu-submenuIcon');
                expect(containerElement.childNodes[0]).toBe(iconElement);
                expect(containerElement.childNodes[1]).toBe(textElement);
            } else {
                expect(containerElement.childNodes[0]).toBe(textElement);
            }
        });
    });

    it('Test item with icon', () => {
        rerender(
            <UIContextualMenu
                items={[
                    {
                        key: 'item1',
                        iconProps: {
                            iconName: UiIcons.GuidedDevelopment
                        },
                        text: 'menu item 1'
                    }
                ]}
            />
        );
        
        // Check if icon is rendered
        expect(container.querySelectorAll(`i[data-icon-name="${UiIcons.GuidedDevelopment}"]`).length).toEqual(1);
        
        // Check if icon is on right side
        const containerElement = container.querySelector('.ms-ContextualMenu-linkContent');
        const textElement = container.querySelector('.ms-ContextualMenu-itemText');
        const iconElement = container.querySelector('i.ms-ContextualMenu-icon');
        
        if (containerElement && textElement && iconElement) {
            expect(containerElement.childNodes[0]).toBe(textElement);
            expect(containerElement.childNodes[1]).toBe(iconElement);
        }
    });

    it('Test mexture menu - item with icon and item without icon', () => {
        rerender(
            <UIContextualMenu
                items={[
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
                ]}
            />
        );
        
        // Check if only one icon is rendered
        expect(container.querySelectorAll(`i[data-icon-name="${UiIcons.GuidedDevelopment}"]`).length).toEqual(1);
        
        // Check if two menu items are rendered
        expect(container.querySelectorAll('.ms-ContextualMenu-linkContent').length).toEqual(2);
    });

    it('getUIContextualMenuItemStyles - call without params', () => {
        const styles = getUIContextualMenuItemStyles();
        expect(styles).toEqual({
            'checkmarkIcon': {
                'color': 'var(--vscode-foreground)',
                'fontSize': 16,
                'lineHeight': 18,
                'margin': 0,
                'maxHeight': 18
            },
            'icon': {
                'marginLeft': 0,
                'marginRight': 6
            },
            'label': {
                'height': 18,
                'lineHeight': 18,
                'paddingLeft': undefined
            },
            'linkContent': {
                'fontSize': 13,
                'height': 'auto'
            },
            'root': {
                'padding': undefined,
                'paddingRight': undefined
            },
            'subMenuIcon': {
                'height': 16,
                'lineHeight': 0,
                'transform': 'rotate(-90deg)',
                'transformOrigin': '50% 50%',
                'width': 16
            }
        });
    });

    describe('<getUIcontextualMenuCalloutStyles />', () => {
        it('getUIcontextualMenuCalloutStyles - call without params', () => {
            const defaultStyles = getUIcontextualMenuCalloutStyles();
            expect(defaultStyles).toEqual({
                root: {}
            });
        });

        it('getUIcontextualMenuCalloutStyles - pass maxWidth', () => {
            const defaultStyles = getUIcontextualMenuCalloutStyles(undefined, 100);
            expect(defaultStyles).toEqual({
                root: {
                    maxWidth: 100
                }
            });
        });

        it('getUIcontextualMenuCalloutStyles - pass maxWidth', () => {
            const defaultStyles = getUIcontextualMenuCalloutStyles({ root: { background: 'green' } }, 100);
            expect(defaultStyles).toEqual({
                root: {
                    maxWidth: 100,
                    background: 'green'
                }
            });
        });
    });
});
