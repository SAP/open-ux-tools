import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IStyleFunction, IToggleStyles, IRawStyle } from '@fluentui/react';
import { Toggle } from '@fluentui/react';
import type { UIToggleProps } from '../../../src/components/UIToggle/UIToggle';
import { UIToggle, UIToggleSize } from '../../../src/components/UIToggle/UIToggle';

describe('<UIToggle />', () => {
    let wrapper: Enzyme.ReactWrapper<UIToggleProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIToggle />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIToggle component', () => {
        expect(wrapper.find('.ms-Toggle').length).toEqual(1);
    });

    describe('Styles', () => {
        const testCases = [
            {
                name: 'Standard',
                size: UIToggleSize.Standard,
                expect: {}
            },
            {
                name: 'Default',
                size: undefined,
                expect: {}
            },
            {
                name: 'Small',
                size: UIToggleSize.Small,
                expect: {
                    margin: '0',
                    fontSize: 13,
                    padding: '2px 0',
                    height: 14,
                    width: 30,
                    innerPadding: '0 2px',
                    thumbHeight: 10,
                    thumbWidth: 10,
                    borderWidth: 5
                }
            }
        ];
        for (const testCase of testCases) {
            it(`Property "size" - value ${testCase.name}`, () => {
                wrapper.setProps({
                    size: testCase.size
                });
                const styles = (wrapper.find(Toggle).props().styles as IStyleFunction<{}, {}>)({}) as IToggleStyles;
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
            const styles = (wrapper.find(Toggle).props().styles as IStyleFunction<{}, {}>)({}) as IToggleStyles;
            expect(styles.pill).toMatchInlineSnapshot(`
                Object {
                  ":disabled": Object {
                    "background": "var(--vscode-titleBar-inactiveForeground)",
                    "borderColor": "var(--vscode-contrastBorder, transparent)",
                    "opacity": 0.4,
                  },
                  ":hover": Object {
                    "background": "var(--vscode-editorHint-foreground)",
                    "borderColor": "var(--vscode-contrastActiveBorder, transparent)",
                  },
                  ":hover .ms-Toggle-thumb": Object {
                    "backgroundColor": "var(--vscode-button-foreground)",
                  },
                  "background": "var(--vscode-titleBar-inactiveForeground)",
                  "borderColor": "var(--vscode-contrastBorder, transparent)",
                  "borderStyle": "dashed",
                  "height": undefined,
                  "padding": undefined,
                  "selectors": Object {
                    ":focus::after": Object {
                      "border": "none !important",
                      "outline": "1px solid var(--vscode-focusBorder) !important",
                    },
                  },
                  "width": undefined,
                }
            `);
            expect(styles.thumb).toMatchInlineSnapshot(`
                Object {
                  ":hover": Object {
                    "backgroundColor": "var(--vscode-button-foreground)",
                  },
                  "background": "var(--vscode-button-foreground)",
                  "borderWidth": undefined,
                  "height": undefined,
                  "width": undefined,
                }
            `);
        });

        it('Checked', () => {
            const styleProps = { checked: true };
            const styles = (wrapper.find(Toggle).props().styles as IStyleFunction<{}, {}>)(styleProps) as IToggleStyles;
            expect(styles.pill).toMatchInlineSnapshot(`
                Object {
                  ":disabled": Object {
                    "background": "var(--vscode-button-background)",
                    "borderColor": "var(--vscode-contrastBorder, transparent)",
                    "opacity": 0.4,
                  },
                  ":hover": Object {
                    "background": "var(--vscode-button-hoverBackground)",
                    "borderColor": "var(--vscode-contrastActiveBorder, transparent)",
                  },
                  ":hover .ms-Toggle-thumb": Object {
                    "backgroundColor": "var(--vscode-button-foreground)",
                  },
                  "background": "var(--vscode-button-background)",
                  "borderColor": "var(--vscode-contrastBorder, transparent)",
                  "borderStyle": "solid",
                  "height": undefined,
                  "padding": undefined,
                  "selectors": Object {
                    ":focus::after": Object {
                      "border": "none !important",
                      "outline": "1px solid var(--vscode-focusBorder) !important",
                    },
                  },
                  "width": undefined,
                }
            `);
            expect(styles.thumb).toMatchInlineSnapshot(`
                Object {
                  ":hover": Object {
                    "backgroundColor": "var(--vscode-button-foreground)",
                  },
                  "background": "var(--vscode-button-foreground)",
                  "borderWidth": undefined,
                  "height": undefined,
                  "width": undefined,
                }
            `);
        });
    });

    describe('Validation message', () => {
        it('Error - standard', () => {
            wrapper.setProps({
                errorMessage: 'dummy',
                inlineLabel: false
            });
            const styles = (wrapper.find(Toggle).props().styles as IStyleFunction<{}, {}>)({}) as IToggleStyles;
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles.marginBottom).toEqual(4);
            expect(wrapper.find('.ts-message-wrapper--error').length).toEqual(1);
        });

        it('Error - inline', () => {
            wrapper.setProps({
                errorMessage: 'dummy',
                inlineLabel: true
            });
            const styles = (wrapper.find(Toggle).props().styles as IStyleFunction<{}, {}>)({}) as IToggleStyles;
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles.marginBottom).toEqual(0);
            expect(wrapper.find('.ts-message-wrapper--error').length).toEqual(1);
        });

        it('Warning', () => {
            wrapper.setProps({
                warningMessage: 'dummy'
            });
            expect(wrapper.find('.ts-message-wrapper--warning').length).toEqual(1);
        });

        it('Info', () => {
            wrapper.setProps({
                infoMessage: 'dummy'
            });
            expect(wrapper.find('.ts-message-wrapper--info').length).toEqual(1);
        });
    });
});
