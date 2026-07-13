import * as React from 'react';
import { render } from '@testing-library/react';
import type { ITextFieldStyleProps, ITextFieldStyles } from '@fluentui/react';
import type { InputRenderProps, UITextInputProps } from '../../../src/components/UIInput';
import { UITextInput } from '../../../src/components/UIInput';

/**
 * Instantiate UITextInput with the given props and invoke the private
 * `getStyles` arrow function that the component passes to <TextField>.
 *
 * @param props - Props to pass to the UITextInput instance.
 * @param additionalStyleProps - Extra style-state props forwarded to the styles function (e.g. `{focused: true}`).
 */
function getStyles(
    props: Partial<UITextInputProps>,
    additionalStyleProps: Partial<ITextFieldStyleProps> = {}
): ITextFieldStyles {
    const instance = new UITextInput(props as UITextInputProps);
    const stylesFn = (instance as unknown as { getStyles: (p: ITextFieldStyleProps) => ITextFieldStyles }).getStyles;
    return stylesFn({ ...props, ...additionalStyleProps } as ITextFieldStyleProps) as ITextFieldStyles;
}

describe('<UIToggle />', () => {
    it('Should render a UITextInput component', () => {
        const { container } = render(<UITextInput />);
        expect(container.querySelectorAll('.ms-TextField').length).toEqual(1);
    });

    it('Styles - default', () => {
        expect(getStyles({})).toMatchSnapshot();
    });

    it('Styles - required', () => {
        expect(getStyles({ required: true })).toMatchSnapshot();
    });

    const testCases = [
        // Single line
        {
            multiline: false,
            disabled: undefined,
            readOnly: undefined
        },
        {
            multiline: false,
            disabled: true,
            readOnly: undefined
        },
        {
            multiline: false,
            disabled: undefined,
            readOnly: true
        },
        // Multi line
        {
            multiline: true,
            disabled: undefined,
            readOnly: undefined
        },
        {
            multiline: true,
            disabled: true,
            readOnly: undefined
        },
        {
            multiline: true,
            disabled: undefined,
            readOnly: true
        }
    ];
    for (const testCase of testCases) {
        it(`Styles - multiline=${testCase.multiline}, disabled=${testCase.disabled}, readOnly=${testCase.readOnly}`, () => {
            expect(
                getStyles({
                    multiline: testCase.multiline,
                    disabled: testCase.disabled,
                    readOnly: testCase.readOnly
                })
            ).toMatchSnapshot();
        });
    }

    it('Readonly input field with value', () => {
        expect(getStyles({ readOnly: true, value: 'test' })).toMatchSnapshot();
    });

    it('Disabled textfield, but input should be readonly', () => {
        const { container } = render(<UITextInput disabled={true} value="test" />);
        const input = container.querySelector('input.ms-TextField-field') as HTMLInputElement | null;
        expect(input?.disabled).toEqual(false);
        expect(input?.readOnly).toEqual(true);
        expect(input?.getAttribute('aria-disabled')).toEqual('true');
    });

    const focusTestCases = [
        {
            errorMessage: true
        },
        {
            errorMessage: false
        }
    ];
    for (const errorMessage of focusTestCases) {
        it(`Focus styles, "errorMessage=${errorMessage}"`, () => {
            expect(
                getStyles({ errorMessage: errorMessage.errorMessage ? 'dummy' : undefined }, { focused: true })
            ).toMatchSnapshot();
        });
    }

    describe('Styles - error message', () => {
        it('Error', () => {
            expect(getStyles({ errorMessage: 'dummy' })).toMatchSnapshot();
        });

        it('Warning', () => {
            expect(getStyles({ warningMessage: 'dummy' })).toMatchSnapshot();
        });

        it('Info', () => {
            expect(getStyles({ infoMessage: 'dummy' })).toMatchSnapshot();
        });

        it('Error - custom component', async () => {
            const { container, rerender } = render(<UITextInput />);
            rerender(<UITextInput errorMessage={<div className="dummyError">TEST</div>} />);
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(container.querySelectorAll('.dummyError').length).toEqual(1);
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
            expect(container.querySelectorAll('.custom-render-option').length).toEqual(1);
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
            expect(container.querySelectorAll('.custom-render-option').length).toEqual(1);
            const input = container.querySelector('input.ms-TextField-field') as HTMLInputElement | null;
            expect(input?.disabled).toEqual(false);
            expect(input?.readOnly).toEqual(true);
        });
    });
});
