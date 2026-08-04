import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import type { IStyleFunction, IToggleStyles, IRawStyle } from '@fluentui/react';
import type { UIToggleProps } from '../../../src/components/UIToggle/UIToggle';
import { UIToggle } from '../../../src/components/UIToggle/UIToggle';
import { findStyleFromStyleSheets } from '../../utils/styles';

// getStyles is only needed for pseudo-state assertions (`:hover`, `:disabled`, `selectors`)
// which are not accessible via getComputedStyle or document.styleSheets in jsdom.
function getStyles(props: Partial<UIToggleProps>, styleProps: object = {}): IToggleStyles {
    const instance = new UIToggle(props as UIToggleProps);
    const rendered = instance.render();
    const toggleElement = rendered?.props?.message !== undefined ? rendered.props.children : rendered;
    const stylesFn = toggleElement?.props?.styles as IStyleFunction<object, IToggleStyles>;
    return stylesFn(styleProps) as IToggleStyles;
}

describe('<UIToggle />', () => {
    const handleChangeMock = jest.fn();

    afterEach(() => {
        handleChangeMock.mockClear();
    });

    it('Should render a UIToggle component', () => {
        const { container } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
        expect(container.querySelectorAll('.ms-Toggle')).toHaveLength(1);
    });

    it('Should toggle the checked state correctly', () => {
        const { container, rerender } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
        expect(container.querySelectorAll('.ms-Toggle.is-checked')).toHaveLength(0);

        const button = container.querySelector('button') as HTMLButtonElement;
        fireEvent.click(button);
        expect(handleChangeMock).toHaveBeenCalledTimes(1);

        // Simulate controlled prop change (checked=true) via rerender
        act(() => {
            rerender(<UIToggle onChange={handleChangeMock} checked={true} />);
        });

        expect(container.querySelectorAll('.ms-Toggle.is-checked')).toHaveLength(1);
    });

    describe('Styles', () => {
        it('size - pill dimensions via rendered DOM', () => {
            render(<UIToggle onChange={handleChangeMock} checked={false} />);
            const pill = document.body.querySelector('.ms-Toggle-background') as HTMLElement;
            expect(window.getComputedStyle(pill).height).toEqual('18px');
            expect(window.getComputedStyle(pill).width).toEqual('30px');
        });

        it('label - font size and padding via rendered DOM', () => {
            render(<UIToggle onChange={handleChangeMock} checked={false} label="test" />);
            const label = document.body.querySelector('.ms-Label') as HTMLElement;
            expect(window.getComputedStyle(label).fontSize).toEqual('13px');
        });

        it('pill - unchecked border color via CSS', () => {
            render(<UIToggle onChange={handleChangeMock} checked={false} />);
            const pill = document.body.querySelector('.ms-Toggle-background') as HTMLElement;
            expect(findStyleFromStyleSheets('borderColor', pill)).toEqual('var(--vscode-editorWidget-border)');
        });

        it('pill - checked border color via CSS', () => {
            render(<UIToggle onChange={handleChangeMock} checked={true} />);
            const pill = document.body.querySelector('.ms-Toggle-background') as HTMLElement;
            expect(findStyleFromStyleSheets('borderColor', pill)).toEqual(
                'var(--vscode-contrastActiveBorder, var(--vscode-editorWidget-border))'
            );
        });

        it('pill - unchecked vs checked use different border colors (via getStyles for pseudo-states)', () => {
            const unchecked = getStyles({ checked: false }, { checked: false });
            const checked = getStyles({ checked: false }, { checked: true });
            expect((unchecked.pill as IRawStyle).borderColor).not.toEqual((checked.pill as IRawStyle).borderColor);
        });

        it('pill - has focus :focus::after outline selector', () => {
            const styles = getStyles({ checked: false });
            const pill = styles.pill as IRawStyle;
            expect((pill.selectors as Record<string, unknown>)?.[':focus::after']).toBeDefined();
        });

        it('thumb - unchecked uses secondary background', () => {
            const styles = getStyles({ checked: false }, { checked: false });
            const thumb = styles.thumb as IRawStyle;
            expect(thumb.backgroundColor).toEqual('var(--vscode-button-secondaryBackground)');
        });

        it('thumb - checked uses primary background', () => {
            const styles = getStyles({ checked: false }, { checked: true });
            const thumb = styles.thumb as IRawStyle;
            expect(thumb.backgroundColor).toEqual('var(--vscode-button-background)');
        });
    });

    describe('Validation message', () => {
        it('Error - standard', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} errorMessage="dummy" inlineLabel={false} />
            );

            const styles = getStyles({ checked: false, errorMessage: 'dummy', inlineLabel: false });
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles.marginBottom).toEqual(4);
            expect(container.querySelectorAll('.ts-message-wrapper--error')).toHaveLength(1);
        });

        it('Error - inline', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} errorMessage="dummy" inlineLabel={true} />
            );

            const styles = getStyles({ checked: false, errorMessage: 'dummy', inlineLabel: true });
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles.marginBottom).toEqual(0);
            expect(container.querySelectorAll('.ts-message-wrapper--error')).toHaveLength(1);
        });

        it('Warning', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} warningMessage="dummy" />
            );
            expect(container.querySelectorAll('.ts-message-wrapper--warning')).toHaveLength(1);
        });

        it('Info', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} infoMessage="dummy" />
            );
            expect(container.querySelectorAll('.ts-message-wrapper--info')).toHaveLength(1);
        });
    });
});
