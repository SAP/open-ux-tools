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
        let style = getStyle(buttons[0]);
        expect(style.height).toEqual('22px');

        const icons = container.querySelectorAll(selectors.icon);
        expect(icons.length).toEqual(1);
        // First child should take 'path' element - color should not be overwritten
        style = getStyle(icons[0]?.firstChild as Element);
        expect(style.fill).toEqual('');
    });
});
