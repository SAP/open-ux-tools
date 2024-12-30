import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IStyleFunction, IToggleStyles, IRawStyle } from '@fluentui/react';
import { Toggle } from '@fluentui/react';
import type { UIToggleProps } from '../../../src/components/UIToggle/UIToggle';
import { UIToggle, UIToggleSize } from '../../../src/components/UIToggle/UIToggle';

describe('<UIToggle />', () => {
    let wrapper: Enzyme.ReactWrapper<UIToggleProps>;
    const handleChangeMock = jest.fn();

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIToggle onChange={handleChangeMock} checked={false} />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIToggle component', () => {
        expect(wrapper.find('.ms-Toggle').length).toEqual(1);
    });

    it('Should toggle the checked state correctly', () => {
        expect(wrapper.find('.ms-Toggle.is-checked').length).toEqual(0);

        // Simulate toggle behavior
        wrapper.find('button').simulate('click');
        // Assert that handleChange was called once
        expect(handleChangeMock).toHaveBeenCalledTimes(1);
        wrapper.setProps({ checked: true }); // Simulating controlled prop change
        wrapper.update();

        // New state: checked
        expect(wrapper.find('.ms-Toggle.is-checked').length).toEqual(1);
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
                  "width": 14,
                }
            `);
        });

        it('Checked', () => {
            const styleProps = { checked: true };
            const styles = (wrapper.find(Toggle).props().styles as IStyleFunction<{}, {}>)(styleProps) as IToggleStyles;
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
                  "width": 14,
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
