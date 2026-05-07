import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { IToggleStyleProps, IToggleStyles, IRawStyle } from '@fluentui/react';
import type { UIToggleProps } from '../../../src/components/UIToggle/UIToggle';
import { UIToggle, UIToggleSize } from '../../../src/components/UIToggle/UIToggle';

class UIToggleTestHelper extends UIToggle {
    public callStyles(styleProps: Partial<IToggleStyleProps> = {}): Partial<IToggleStyles> {
        const element = this.render() as React.ReactElement;
        // render() returns either <Toggle> or <MessageWrapper><Toggle/></MessageWrapper>
        const stylesFunc = element.props.styles ?? element.props.children?.props?.styles;
        return stylesFunc(styleProps);
    }
}

describe('<UIToggle />', () => {
    const handleChangeMock = jest.fn();

    beforeEach(() => {
        handleChangeMock.mockClear();
    });

    it('Should render a UIToggle component', () => {
        render(<UIToggle onChange={handleChangeMock} checked={false} />);
        expect(document.querySelector('.ms-Toggle')).toBeInTheDocument();
    });

    it('Should toggle the checked state correctly', () => {
        const { rerender } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
        expect(document.querySelector('.ms-Toggle.is-checked')).not.toBeInTheDocument();

        // Simulate toggle behavior
        const button = screen.getByRole('switch');
        fireEvent.click(button);
        // Assert that handleChange was called once
        expect(handleChangeMock).toHaveBeenCalledTimes(1);
        rerender(<UIToggle onChange={handleChangeMock} checked={true} />); // Simulating controlled prop change

        // New state: checked
        expect(document.querySelector('.ms-Toggle.is-checked')).toBeInTheDocument();
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
                const helper = new UIToggleTestHelper({ onChange: handleChangeMock, checked: false, size: testCase.size });
                const styles = helper.callStyles({});
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
            const helper = new UIToggleTestHelper({ onChange: handleChangeMock, checked: false });
            const styles = helper.callStyles({});
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
                    "borderColor": "var(--vscode-button-border, transparent)",
                  },
                  "background": "var(--vscode-editorWidget-background)",
                  "borderColor": "var(--vscode-editorWidget-border)",
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
                  "borderColor": "var(--vscode-button-border, transparent)",
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
            const helper = new UIToggleTestHelper({ onChange: handleChangeMock, checked: true });
            const styles = helper.callStyles({ checked: true });
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
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} errorMessage="dummy" inlineLabel={false} />
            );
            expect(container.querySelector('.ts-message-wrapper--error')).toBeInTheDocument();
        });

        it('Error - inline', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} errorMessage="dummy" inlineLabel={true} />
            );
            expect(container.querySelector('.ts-message-wrapper--error')).toBeInTheDocument();
        });

        it('Warning', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} warningMessage="dummy" />
            );
            expect(container.querySelector('.ts-message-wrapper--warning')).toBeInTheDocument();
        });

        it('Info', () => {
            const { container } = render(<UIToggle onChange={handleChangeMock} checked={false} infoMessage="dummy" />);
            expect(container.querySelector('.ts-message-wrapper--info')).toBeInTheDocument();
        });
    });
});
