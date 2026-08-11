import * as React from 'react';
import { render } from '@testing-library/react';
import { UiIcons, initIcons, UIActionButton } from '../../../src/components';

describe('<UIActionButton />', () => {
    initIcons();

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

        const button = container.querySelector('button') as HTMLButtonElement;
        expect(button).not.toBeNull();
        const style = getStyle(button);
        expect(style.height).toEqual('26px');

        const svgs = container.querySelectorAll('svg');
        expect(svgs.length).toEqual(1);
        // First child should be a 'path' element with proper CSS variable fill
        const pathElement = svgs[0]?.firstChild as Element;
        expect(pathElement.tagName.toLowerCase()).toBe('path');
        expect(pathElement.getAttribute('fill')).toBe('var(--vscode-icon-foreground, var(--vscode-foreground))');
    });
});
