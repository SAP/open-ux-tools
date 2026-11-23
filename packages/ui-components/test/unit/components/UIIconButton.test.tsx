import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { UiIcons, initIcons, UIIconButton } from '../../../src/components';

describe('<UIIconButton />', () => {
    initIcons();

    const getStyle = (element: Element): CSSStyleDeclaration => {
        return window.getComputedStyle(element);
    };

    it('Render button - default', () => {
        const { container } = render(
            <UIIconButton
                iconProps={{
                    iconName: UiIcons.CopyToClipboard
                }}
                text="Copy"></UIIconButton>
        );

        expect(container.firstElementChild?.classList.contains('is-checked')).toBeFalsy();
        const icon = container.querySelector('i') as Element;
        expect(getStyle(icon).alignItems).toEqual('center');
        const flexContainer = container.querySelector('.ms-Button-flexContainer') as Element;
        expect(getStyle(flexContainer).pointerEvents).toEqual('none');
    });

    it('Render button - checked', () => {
        const { container } = render(
            <UIIconButton
                iconProps={{
                    iconName: UiIcons.CopyToClipboard
                }}
                text="Copy"
                checked={true}></UIIconButton>
        );

        expect(container.firstElementChild?.classList.contains('is-checked')).toBeTruthy();
    });

    describe('propagateMenuOpenKeyDown', () => {
        const menuProps = { items: [{ key: 'item1', text: 'Item 1' }] };

        it('calls preventDefault on Alt+Down by default', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(<UIIconButton menuProps={menuProps} onKeyDown={onKeyDown} />);
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
                <UIIconButton menuProps={menuProps} propagateMenuOpenKeyDown={false} onKeyDown={onKeyDown} />
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(false);
        });
    });
});
