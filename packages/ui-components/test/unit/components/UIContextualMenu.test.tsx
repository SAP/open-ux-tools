import * as React from 'react';
import { render, cleanup } from '@testing-library/react';
import {
    getUIcontextualMenuCalloutStyles,
    getUIContextualMenuItemStyles,
    UIContextualMenu
} from '../../../src/components/UIContextualMenu';
import { UiIcons, initIcons } from '../../../src/components/Icons';

describe('<UIContextualMenu />', () => {
    initIcons();

    const defaultItems = [
        { key: 'item1', text: 'menu item 1' },
        { key: 'item2', text: 'menu item 2' }
    ];

    afterEach(() => {
        cleanup();
    });

    it('Existence', () => {
        render(<UIContextualMenu items={defaultItems} />);
        // Fluent UI ContextualMenu renders into a portal in document.body
        expect(document.body.querySelectorAll('div.ts-ContextualMenu')).toHaveLength(1);
    });

    it('Test className property', () => {
        const { rerender } = render(<UIContextualMenu items={defaultItems} />);
        const el = document.body.querySelector('.ts-ContextualMenu') as HTMLElement;
        expect(el.className).toContain('ts-ContextualMenu');
        expect(el.className).toContain('ts-ContextualMenu--dropdown');

        rerender(<UIContextualMenu items={defaultItems} className="dummy" />);
        const el2 = document.body.querySelector('.ts-ContextualMenu') as HTMLElement;
        expect(el2.className).toContain('ts-ContextualMenu ts-ContextualMenu--dropdown dummy');
    });

    it('iconToLeft prop', () => {
        const items = [
            {
                key: 'item1',
                text: 'menu item 1',
                subMenuProps: {
                    items: [{ key: 'item1', text: 'item 1 - submenu1' }]
                }
            },
            { key: 'item2', text: 'menu item 2' }
        ];

        render(<UIContextualMenu items={items} iconToLeft={true} />);

        const containerElements = document.body.querySelectorAll('.ms-ContextualMenu-linkContent');
        containerElements.forEach((containerElement, index) => {
            const textElement = containerElement.querySelector('.ms-ContextualMenu-itemText') as HTMLElement;
            if (index === 0) {
                const iconElement = containerElement.querySelector('i.ms-ContextualMenu-submenuIcon') as HTMLElement;
                expect(containerElement.childNodes[0]).toBe(iconElement);
                expect(containerElement.childNodes[1]).toBe(textElement);
            } else {
                expect(containerElement.childNodes[0]).toBe(textElement);
            }
        });
    });

    it('Test item with icon', () => {
        const items = [
            {
                key: 'item1',
                iconProps: { iconName: UiIcons.GuidedDevelopment },
                text: 'menu item 1'
            }
        ];

        render(<UIContextualMenu items={items} />);

        // Check if icon is rendered
        expect(document.body.querySelectorAll(`i[data-icon-name="${UiIcons.GuidedDevelopment}"]`)).toHaveLength(1);
        // Check icon is on right side (text first, then icon)
        const containerElement = document.body.querySelector('.ms-ContextualMenu-linkContent') as HTMLElement;
        const textElement = document.body.querySelector('.ms-ContextualMenu-itemText') as HTMLElement;
        const iconElement = document.body.querySelector('i.ms-ContextualMenu-icon') as HTMLElement;
        expect(containerElement.childNodes[0]).toBe(textElement);
        expect(containerElement.childNodes[1]).toBe(iconElement);
    });

    it('Test mixture menu - item with icon and item without icon', () => {
        const items = [
            { key: 'item1', text: 'menu item 1' },
            {
                key: 'item2',
                iconProps: { iconName: UiIcons.GuidedDevelopment },
                text: 'menu item 2'
            }
        ];

        render(<UIContextualMenu items={items} />);

        // Check if only one icon is rendered
        expect(document.body.querySelectorAll(`i[data-icon-name="${UiIcons.GuidedDevelopment}"]`)).toHaveLength(1);
        // Check if two menu items are rendered
        expect(document.body.querySelectorAll('.ms-ContextualMenu-linkContent')).toHaveLength(2);
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

        it('getUIcontextualMenuCalloutStyles - pass maxWidth and custom styles', () => {
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
