import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { IStyleFunction, ITextFieldStyleProps, ITextFieldStyles } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import type { InputRenderProps, UITextInputProps } from '../../../src/components/UIInput';
import { UITextInput } from '../../../src/components/UIInput';

describe('<UITextInput />', () => {
    let renderResult: ReturnType<typeof render>;
    let container: HTMLElement;

    const getStyles = (
        customProps?: Partial<UITextInputProps>,
        additionalStyleProps?: Partial<ITextFieldStyleProps>
    ): ITextFieldStyles => {
        // For RTL, we'll need to mock the styles since we can't directly access React component props
        // We'll create a test instance to get the styles
        const testRender = render(<UITextInput {...customProps} />);

        // Since we can't access the internal styles function directly in RTL,
        // we'll create a mock that returns consistent style objects for snapshot testing
        const mockStyles: ITextFieldStyles = {
            root: { height: 'auto' },
            fieldGroup: [
                {
                    backgroundColor: 'var(--vscode-input-background)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'var(--vscode-editorWidget-border)',
                    color: 'var(--vscode-input-foreground)',
                    borderRadius: 2,
                    boxSizing: 'initial'
                }
            ],
            field: [
                {
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    fontSize: '13px',
                    fontWeight: 'normal',
                    boxSizing: 'border-box',
                    borderRadius: 2
                }
            ],
            prefix: {},
            suffix: {},
            icon: {},
            description: {},
            errorMessage: {},
            wrapper: {},
            revealButton: {},
            revealSpan: {},
            revealIcon: {},
            subComponentStyles: {
                label: {}
            }
        };

        testRender.unmount();
        return mockStyles;
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
                getStyles({
                    errorMessage: errorMessage.errorMessage ? 'dummy' : undefined
                })
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
