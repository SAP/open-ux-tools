import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
        expect(svgs).toHaveLength(1);
        // First child should be a 'path' element with proper CSS variable fill
        const pathElement = svgs[0]?.firstChild as Element;
        expect(pathElement.tagName.toLowerCase()).toBe('path');
        expect(pathElement.getAttribute('fill')).toBe('var(--vscode-icon-foreground, var(--vscode-foreground))');
    });

    describe('propagateMenuOpenKeyDown', () => {
        const menuProps = { items: [{ key: 'item1', text: 'Item 1' }] };

        it('calls preventDefault on Alt+Down by default', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(
                <UIActionButton menuProps={menuProps} onKeyDown={onKeyDown}>
                    Test
                </UIActionButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(true);
        });

        it('does not call preventDefault on Alt+Down when propagateMenuOpenKeyDown is false', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(
                <UIActionButton menuProps={menuProps} propagateMenuOpenKeyDown={false} onKeyDown={onKeyDown}>
                    Test
                </UIActionButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(false);
        });
    });
});
