import * as React from 'react';
import { render } from '@testing-library/react';
import type { ITextFieldStyleProps, ITextFieldStyles } from '@fluentui/react';
import type { InputRenderProps, UITextInputProps } from '../../../src/components/UIInput';
import { UITextInput } from '../../../src/components/UIInput';
import { compareStylesBySelector, findStyleFromStyleSheets } from '../../utils/styles';

// getStyles is only needed for pseudo-element assertions (::after, :after) which
// are not accessible via getComputedStyle or document.styleSheets in jsdom.
function getStyles(
    props: Partial<UITextInputProps>,
    additionalStyleProps: Partial<ITextFieldStyleProps> = {}
): ITextFieldStyles {
    const instance = new UITextInput(props as UITextInputProps);
    const stylesFn = (instance as unknown as { getStyles: (p: ITextFieldStyleProps) => ITextFieldStyles }).getStyles;
    return stylesFn({ ...props, ...additionalStyleProps } as ITextFieldStyleProps) as ITextFieldStyles;
}

describe('<UITextInput />', () => {
    it('Should render a UITextInput component', () => {
        const { container } = render(<UITextInput />);
        expect(container.querySelectorAll('.ms-TextField')).toHaveLength(1);
    });

    it('Disabled textfield, but input should be readonly', () => {
        const { container } = render(<UITextInput disabled={true} value="test" />);
        const input = container.querySelector('input.ms-TextField-field') as HTMLInputElement | null;
        expect(input?.disabled).toEqual(false);
        expect(input?.readOnly).toEqual(true);
        expect(input?.getAttribute('aria-disabled')).toEqual('true');
    });

    describe('Styles - fieldGroup', () => {
        it('default - solid border', () => {
            render(<UITextInput />);
            compareStylesBySelector('.ms-TextField-fieldGroup', { borderStyle: 'solid' });
        });

        it('disabled - applies opacity and background', () => {
            render(<UITextInput disabled={true} />);
            const el = document.body.querySelector('.ms-TextField-fieldGroup') as HTMLElement;
            expect(window.getComputedStyle(el).opacity).toEqual('0.5');
            expect(findStyleFromStyleSheets('backgroundColor', el)).toEqual(
                'var(--vscode-editor-inactiveSelectionBackground)'
            );
        });

        it('readOnly - dashed border', () => {
            render(<UITextInput readOnly={true} />);
            const el = document.body.querySelector('.ms-TextField-fieldGroup') as HTMLElement;
            expect(window.getComputedStyle(el).borderStyle).toEqual('dashed');
        });

        it('error - error border color', () => {
            render(<UITextInput errorMessage="dummy" />);
            const el = document.body.querySelector('.ms-TextField-fieldGroup') as HTMLElement;
            expect(findStyleFromStyleSheets('borderColor', el)).toEqual('var(--vscode-inputValidation-errorBorder)');
        });

        it('warning - warning border color', () => {
            render(<UITextInput warningMessage="dummy" />);
            const el = document.body.querySelector('.ms-TextField-fieldGroup') as HTMLElement;
            expect(findStyleFromStyleSheets('borderColor', el)).toEqual('var(--vscode-inputValidation-warningBorder)');
        });

        it('focused - :after border (pseudo-element, via getStyles)', () => {
            const styles = getStyles({}, { focused: true });
            const fieldGroup = styles.fieldGroup as Array<Record<string, unknown>>;
            const focusStyle = fieldGroup.find(
                (s) => (s?.selectors as Record<string, unknown>)?.[':after'] !== undefined
            );
            expect(focusStyle).toBeDefined();
        });
    });

    describe('Styles - field (input element)', () => {
        it('multiline adds minHeight', () => {
            render(<UITextInput multiline={true} />);
            const el = document.body.querySelector('.ms-TextField-field') as HTMLElement;
            expect(window.getComputedStyle(el).minHeight).toEqual('60px');
        });

        it('readOnly applies italic fontStyle', () => {
            render(<UITextInput readOnly={true} />);
            const el = document.body.querySelector('.ms-TextField-field') as HTMLElement;
            expect(window.getComputedStyle(el).fontStyle).toEqual('italic');
        });
    });

    describe('Styles - label', () => {
        it('disabled label gets opacity', () => {
            render(<UITextInput disabled={true} label="test" />);
            const el = document.body.querySelector('label.ms-Label') as HTMLElement;
            expect(window.getComputedStyle(el).opacity).toEqual('0.5');
        });

        it('required label gets ::after indicator (pseudo-element, via getStyles)', () => {
            const styles = getStyles({}, { required: true });
            const labelRoot = (styles.subComponentStyles?.label as { root: Array<Record<string, unknown>> })?.root;
            const requiredStyle = labelRoot.find((s) => s?.selectors !== undefined);
            expect((requiredStyle?.selectors as Record<string, unknown>)?.['::after']).toMatchObject({
                color: 'var(--vscode-inputValidation-errorBorder)'
            });
        });
    });

    describe('Styles - error message', () => {
        it('Error - custom component renders in DOM', async () => {
            const { container } = render(<UITextInput errorMessage={<div className="dummyError">TEST</div>} />);
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(container.querySelectorAll('.dummyError')).toHaveLength(1);
        });
    });

    describe('Custom renderers for "onRenderInput"', () => {
        it('External "onRenderInput"', () => {
            const { container } = render(
                <UITextInput
                    onRenderInput={(
                        props?: InputRenderProps,
                        defaultRender?: (props?: InputRenderProps) => JSX.Element | null
                    ) => {
                        return <div className="custom-render-option">{defaultRender?.(props)}</div>;
                    }}
                />
            );
            expect(container.querySelectorAll('.custom-render-option')).toHaveLength(1);
            const input = container.querySelector('input.ms-TextField-field') as HTMLInputElement | null;
            expect(input?.disabled).toEqual(false);
            expect(input?.readOnly).toEqual(false);
        });

        it('External and internal "onRenderInput"', () => {
            const { container } = render(
                <UITextInput
                    disabled={true}
                    onRenderInput={(
                        props?: InputRenderProps,
                        defaultRender?: (props?: InputRenderProps) => JSX.Element | null
                    ) => {
                        return <div className="custom-render-option">{defaultRender?.(props)}</div>;
                    }}
                />
            );
            expect(container.querySelectorAll('.custom-render-option')).toHaveLength(1);
            const input = container.querySelector('input.ms-TextField-field') as HTMLInputElement | null;
            expect(input?.disabled).toEqual(false);
            expect(input?.readOnly).toEqual(true);
        });
    });
});
