import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import type { IStyleFunction, IToggleStyles, IRawStyle } from '@fluentui/react';
import type { UIToggleProps } from '../../../src/components/UIToggle/UIToggle';
import { UIToggle, UIToggleSize } from '../../../src/components/UIToggle/UIToggle';

/**
 * Extract the `styles` function that UIToggle passes to the inner <Toggle>.
 *
 * UIToggle is a class component whose `render()` either returns the Toggle
 * element directly or wraps it in a MessageWrapper.  In both cases the
 * Toggle element (and therefore its `styles` prop) is reachable without
 * mounting the component.
 *
 * @param props - Props to pass to the UIToggle instance.
 * @param styleProps - Style-state props forwarded to the styles function (e.g. `{checked: true}`).
 */
function getStyles(props: Partial<UIToggleProps>, styleProps: object = {}): IToggleStyles {
    const instance = new UIToggle(props as UIToggleProps);
    const rendered = instance.render();
    // When a validation message is present, render() returns
    // <MessageWrapper><Toggle .../></MessageWrapper>
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
        expect(container.querySelectorAll('.ms-Toggle').length).toEqual(1);
    });

    it('Should toggle the checked state correctly', () => {
        const { container, rerender } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
        expect(container.querySelectorAll('.ms-Toggle.is-checked').length).toEqual(0);

        const button = container.querySelector('button') as HTMLButtonElement;
        fireEvent.click(button);
        expect(handleChangeMock).toHaveBeenCalledTimes(1);

        // Simulate controlled prop change (checked=true) via rerender
        act(() => {
            rerender(<UIToggle onChange={handleChangeMock} checked={true} />);
        });

        expect(container.querySelectorAll('.ms-Toggle.is-checked').length).toEqual(1);
    });

    describe('Styles', () => {
        const testCases = [
            {
                name: 'Standard',
                size: UIToggleSize.Standard,
                expect: {
                    margin: '0',
                    fontSize: 13,
                    padding: '0px 0px 1px 0px',
                    height: 18,
                    width: 30,
                    innerPadding: '0 1px',
                    thumbHeight: 14,
                    thumbWidth: 14,
                    borderWidth: 1
                }
            },
            {
                name: 'Default',
                size: undefined,
                expect: {
                    margin: '0',
                    fontSize: 13,
                    padding: '0px 0px 1px 0px',
                    height: 18,
                    width: 30,
                    innerPadding: '0 1px',
                    thumbHeight: 14,
                    thumbWidth: 14,
                    borderWidth: 1
                }
            },
            {
                name: 'Small',
                size: UIToggleSize.Small,
                expect: {
                    margin: '0',
                    fontSize: 13,
                    padding: '0px 0px 1px 0px',
                    height: 18,
                    width: 30,
                    innerPadding: '0 1px',
                    thumbHeight: 14,
                    thumbWidth: 14,
                    borderWidth: 1
                }
            }
        ];

        for (const testCase of testCases) {
            it(`Property "size" - value ${testCase.name}`, () => {
                const styles = getStyles({ checked: false, size: testCase.size });
                const rootStyles = styles.root as IRawStyle;
                const labelStyles = styles.label as IRawStyle;
                const pillStyles = styles.pill as IRawStyle;
                const thumbStyles = styles.thumb as IRawStyle;
                const expectation = testCase.expect;
                expect(rootStyles.margin).toEqual(expectation.margin);
                expect(labelStyles.fontSize).toEqual(expectation.fontSize);
                expect(labelStyles.padding).toEqual(expectation.padding);
                expect(pillStyles.height).toEqual(expectation.height);
                expect(pillStyles.width).toEqual(expectation.width);
                expect(pillStyles.padding).toEqual(expectation.innerPadding);
                expect(thumbStyles.height).toEqual(expectation.thumbHeight);
                expect(thumbStyles.width).toEqual(expectation.thumbWidth);
                expect(thumbStyles.borderWidth).toEqual(expectation.borderWidth);
            });
        }

        it('Default', () => {
            const styles = getStyles({ checked: false });
            expect(styles.pill).toMatchInlineSnapshot(`
                Object {
                  ":disabled": Object {
                    "background": "var(--vscode-editorWidget-background)",
                    "borderColor": "var(--vscode-editorWidget-border)",
                    "opacity": 0.4,
                  },
                  ":hover": Object {
                    "background": "var(--vscode-editorWidget-background)",
                    "borderColor": "var(--vscode-editorWidget-border)",
                  },
                  ":hover .ms-Toggle-thumb": Object {
                    "background": "var(--vscode-contrastBorder, var(--vscode-button-secondaryHoverBackground))",
                    "borderColor": "var(--vscode-button-secondaryBorder, var(--vscode-button-border, transparent))",
                  },
                  "background": "var(--vscode-editorWidget-background)",
                  "borderColor": "var(--vscode-editorWidget-border)",
                  "borderRadius": "var(--vscode-cornerRadius-circle, 9999px)",
                  "borderStyle": "solid",
                  "height": 18,
                  "padding": "0 1px",
                  "selectors": Object {
                    ":focus::after": Object {
                      "border": "none !important",
                      "outline": "1px solid var(--vscode-focusBorder) !important",
                    },
                  },
                  "width": 30,
                }
            `);
            expect(styles.thumb).toMatchInlineSnapshot(`
                Object {
                  ":hover": Object {
                    "background": "var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))",
                    "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
                  },
                  "backgroundColor": "var(--vscode-button-secondaryBackground)",
                  "backgroundPosition": "center",
                  "borderColor": "var(--vscode-button-secondaryBorder, var(--vscode-button-border, transparent))",
                  "borderWidth": 1,
                  "height": 14,
                  "svg": Object {
                    "height": "100%",
                    "path": Object {
                      "fill": "var(--vscode-button-secondaryForeground)",
                    },
                    "width": "100%",
                  },
                  "width": 14,
                }
            `);
        });

        it('Checked', () => {
            const styles = getStyles({ checked: false }, { checked: true });
            expect(styles.pill).toMatchInlineSnapshot(`
                Object {
                  ":disabled": Object {
                    "background": "var(--vscode-editorWidget-background)",
                    "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-editorWidget-border))",
                    "opacity": 0.4,
                  },
                  ":hover": Object {
                    "background": "var(--vscode-editorWidget-background)",
                    "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-editorWidget-border))",
                  },
                  ":hover .ms-Toggle-thumb": Object {
                    "background": "var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))",
                    "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
                  },
                  "background": "var(--vscode-editorWidget-background)",
                  "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-editorWidget-border))",
                  "borderRadius": "var(--vscode-cornerRadius-circle, 9999px)",
                  "borderStyle": "solid",
                  "height": 18,
                  "padding": "0 1px",
                  "selectors": Object {
                    ":focus::after": Object {
                      "border": "none !important",
                      "outline": "1px solid var(--vscode-focusBorder) !important",
                    },
                  },
                  "width": 30,
                }
            `);
            expect(styles.thumb).toMatchInlineSnapshot(`
                Object {
                  ":hover": Object {
                    "background": "var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))",
                    "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
                  },
                  "backgroundColor": "var(--vscode-button-background)",
                  "backgroundPosition": "center",
                  "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
                  "borderWidth": 1,
                  "height": 14,
                  "svg": Object {
                    "height": "100%",
                    "path": Object {
                      "fill": "var(--vscode-button-foreground)",
                    },
                    "width": "100%",
                  },
                  "width": 14,
                }
            `);
        });
    });

    describe('Validation message', () => {
        it('Error - standard', () => {
            const { container, rerender } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
            act(() => {
                rerender(
                    <UIToggle onChange={handleChangeMock} checked={false} errorMessage="dummy" inlineLabel={false} />
                );
            });

            const styles = getStyles({ checked: false, errorMessage: 'dummy', inlineLabel: false });
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles.marginBottom).toEqual(4);
            expect(container.querySelectorAll('.ts-message-wrapper--error').length).toEqual(1);
        });

        it('Error - inline', () => {
            const { container, rerender } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
            act(() => {
                rerender(
                    <UIToggle onChange={handleChangeMock} checked={false} errorMessage="dummy" inlineLabel={true} />
                );
            });

            const styles = getStyles({ checked: false, errorMessage: 'dummy', inlineLabel: true });
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles.marginBottom).toEqual(0);
            expect(container.querySelectorAll('.ts-message-wrapper--error').length).toEqual(1);
        });

        it('Warning', () => {
            const { container, rerender } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
            act(() => {
                rerender(<UIToggle onChange={handleChangeMock} checked={false} warningMessage="dummy" />);
            });
            expect(container.querySelectorAll('.ts-message-wrapper--warning').length).toEqual(1);
        });

        it('Info', () => {
            const { container, rerender } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
            act(() => {
                rerender(<UIToggle onChange={handleChangeMock} checked={false} infoMessage="dummy" />);
            });
            expect(container.querySelectorAll('.ts-message-wrapper--info').length).toEqual(1);
        });
    });
});
