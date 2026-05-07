import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ITextFieldStyleProps, ITextFieldStyles } from '@fluentui/react';
import type { InputRenderProps, UITextInputProps } from '../../../src/components/UIInput';
import { UITextInput } from '../../../src/components/UIInput';

class UITextInputTestHelper extends UITextInput {
    public callGetStyles(styleProps: Partial<ITextFieldStyleProps> = {}): Partial<ITextFieldStyles> {
        return (this as any).getStyles(styleProps);
    }
}

describe('<UITextInput />', () => {
    let renderResult: ReturnType<typeof render>;
    let container: HTMLElement;

    const getStyles = (
        componentProps: Partial<UITextInputProps> = {},
        styleProps: Partial<ITextFieldStyleProps> = {}
    ): Partial<ITextFieldStyles> => {
        const helper = new UITextInputTestHelper(componentProps);
        return helper.callGetStyles(styleProps);
    };

    beforeEach(() => {
        renderResult = render(<UITextInput />);
        container = renderResult.container;
    });

    afterEach(() => {
        if (renderResult) {
            renderResult.unmount();
        }
    });

    it('Should render a UITextInput component', () => {
        expect(container.querySelectorAll('.ms-TextField').length).toEqual(1);
    });

    it('Styles - default', () => {
        expect(getStyles()).toMatchSnapshot();
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
        expect(
            getStyles({
                readOnly: true,
                value: 'test'
            })
        ).toMatchSnapshot();
    });

    it('Disabled textfield, but input should be readonly', () => {
        renderResult.rerender(<UITextInput disabled={true} value="test" />);
        const input = container.querySelector('input.ms-TextField-field') as HTMLInputElement;
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
        it(`Focus styles, "errorMessage=${errorMessage.errorMessage}"`, () => {
            expect(
                getStyles(
                    { errorMessage: errorMessage.errorMessage ? 'dummy' : undefined },
                    { focused: true }
                )
            ).toMatchSnapshot();
        });
    }

    describe('Styles - error message', () => {
        it('Error', () => {
            expect(
                getStyles({
                    errorMessage: 'dummy'
                })
            ).toMatchSnapshot();
        });

        it('Warning', () => {
            expect(
                getStyles({
                    warningMessage: 'dummy'
                })
            ).toMatchSnapshot();
        });

        it('Info', () => {
            expect(
                getStyles({
                    infoMessage: 'dummy'
                })
            ).toMatchSnapshot();
        });

        it('Error - custom component', async () => {
            const localRenderResult = render(<UITextInput errorMessage={<div className="dummyError">TEST</div>} />);
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(localRenderResult.container.querySelectorAll('.dummyError').length).toEqual(1);
            localRenderResult.unmount();
        });
    });

    describe('Custom renderers for "onRenderInput"', () => {
        it('External "onRenderInput"', () => {
            const localRenderResult = render(
                <UITextInput
                    onRenderInput={(
                        props?: InputRenderProps,
                        defaultRender?: (props?: InputRenderProps) => JSX.Element | null
                    ) => {
                        return <div className="custom-render-option">{defaultRender?.(props)}</div>;
                    }}
                />
            );
            expect(localRenderResult.container.querySelectorAll('.custom-render-option').length).toEqual(1);
            const input = localRenderResult.container.querySelector('input.ms-TextField-field') as HTMLInputElement;
            expect(input?.disabled).toEqual(false);
            expect(input?.readOnly).toEqual(false);
            localRenderResult.unmount();
        });

        it('External and internal "onRenderInput"', () => {
            const localRenderResult = render(
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
            expect(localRenderResult.container.querySelectorAll('.custom-render-option').length).toEqual(1);
            const input = localRenderResult.container.querySelector('input.ms-TextField-field') as HTMLInputElement;
            expect(input?.disabled).toEqual(false);
            expect(input?.readOnly).toEqual(true);
            localRenderResult.unmount();
        });
    });
});
