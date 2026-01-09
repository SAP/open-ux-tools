import * as React from 'react';
import { render } from '@testing-library/react';
import { UiIcons, initIcons, UIActionButton } from '../../../src/components';

describe('<UIActionButton />', () => {
    initIcons();

    const selectors = {
        button: '.ms-Button.ms-Button--action',
        icon: '.ms-Icon svg'
    };
    const getStyle = (element: Element): CSSStyleDeclaration => {
        return window.getComputedStyle(element);
    };
    it('Render button', () => {
        const { container } = render(
            <UIActionButton
                iconProps={{
                    iconName: UiIcons.CopyToClipboard
                }}
                text="Copy"></UIActionButton>
        );

        const buttons = container.querySelectorAll(selectors.button);
        expect(buttons.length).toEqual(1);
        const style = getStyle(buttons[0]);
        expect(style.height).toEqual('22px');

        const icons = container.querySelectorAll(selectors.icon);
        expect(icons.length).toEqual(1);
        // First child should be a 'path' element with proper CSS variable fill
        const pathElement = icons[0]?.firstChild as Element;
        expect(pathElement.tagName.toLowerCase()).toBe('path');
        expect(pathElement.getAttribute('fill')).toBe('var(--vscode-icon-foreground, var(--vscode-foreground))');
    });
});
