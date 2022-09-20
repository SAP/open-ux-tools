import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IStyleFunction, IChoiceGroupStyleProps, IChoiceGroupStyles } from '@fluentui/react';
import { ChoiceGroup } from '@fluentui/react';
import type { ChoiceGroupProps } from '../../../src/components/UIChoiceGroup/UIChoiceGroup';
import { UIChoiceGroup } from '../../../src/components/UIChoiceGroup/UIChoiceGroup';

describe('<UIToggle />', () => {
    let wrapper: Enzyme.ReactWrapper<ChoiceGroupProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIChoiceGroup />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIChoiceGroup component', () => {
        expect(wrapper.find('.ms-ChoiceFieldGroup').length).toEqual(1);
    });

    it('Styles - default', () => {
        const styles = (wrapper.find(ChoiceGroup).props().styles as IStyleFunction<{}, {}>)(
            {}
        ) as IChoiceGroupStyleProps;
        expect(styles).toMatchInlineSnapshot(`
            Object {
              "label": Object {
                "color": "var(--vscode-input-foreground)",
                "fontFamily": "var(--vscode-font-family)",
                "fontSize": "13px",
                "fontWeight": "bold",
                "padding": "4px 0",
              },
              "root": Object {
                ".is-disabled + .ms-ChoiceField-field": Object {
                  " .ms-ChoiceFieldLabel": Object {
                    "color": "var(--vscode-foreground)",
                    "opacity": 0.4,
                  },
                  ":after": Object {
                    "opacity": 0.4,
                  },
                  ":hover::before": Object {
                    "borderColor": "var(--vscode-editorWidget-border)",
                  },
                },
                ".ms-ChoiceField": Object {
                  "minHeight": 20,
                },
                ".ms-ChoiceField-field": Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                  "fontStyle": "normal",
                  "fontWeight": "normal",
                  "lineHeight": 18,
                  "margin": 0,
                },
                ".ms-ChoiceField-field.is-checked::after": Object {
                  "borderColor": "var(--vscode-input-foreground)",
                },
                ".ms-ChoiceField-field::after": Object {
                  "backgroundColor": "var(--vscode-input-background)",
                  "borderWidth": 4,
                  "height": 8,
                  "left": 5,
                  "top": 5,
                  "transition": "none",
                  "width": 8,
                },
                ".ms-ChoiceField-field::before": Object {
                  "backgroundColor": "var(--vscode-input-background)",
                  "borderColor": "var(--vscode-editorWidget-border)",
                  "height": 18,
                  "left": 0,
                  "top": 0,
                  "width": 18,
                },
                ".ms-ChoiceField-field:hover": Object {
                  "::after": Object {
                    "background": "transparent",
                    "borderColor": "transparent",
                  },
                  "::before": Object {
                    "borderColor": "var(--vscode-focusBorder)",
                  },
                  "span.ms-ChoiceFieldLabel": Object {
                    "color": "var(--vscode-foreground)",
                  },
                },
                ".ms-ChoiceField-input:focus": Object {
                  "opacity": 0,
                },
                ".ms-ChoiceField-wrapper.is-inFocus::after": Object {
                  "borderColor": "var(--vscode-focusBorder)",
                },
                ".ms-ChoiceFieldGroup label.ms-Label": Object {
                  "color": "var(--vscode-input-foreground)",
                  "fontSize": 13,
                  "fontStyle": "normal",
                  "fontWeight": "bold",
                  "lineHeight": 15,
                  "marginTop": 10,
                  "padding": 0,
                },
                ".ms-ChoiceFieldLabel": Object {
                  "paddingLeft": 26,
                },
                "label.ms-ChoiceField-field.is-checked:hover::after": Object {
                  "borderColor": "var(--vscode-input-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - disabled', () => {
        wrapper.setProps({
            disabled: true
        });
        const styles = (wrapper.find(ChoiceGroup).props().styles as IStyleFunction<{}, {}>)(
            {}
        ) as IChoiceGroupStyleProps;
        expect(styles).toMatchInlineSnapshot(`
            Object {
              "label": Object {
                "color": "var(--vscode-input-foreground)",
                "fontFamily": "var(--vscode-font-family)",
                "fontSize": "13px",
                "fontWeight": "bold",
                "opacity": 0.4,
                "padding": "4px 0",
              },
              "root": Object {
                ".is-disabled + .ms-ChoiceField-field": Object {
                  " .ms-ChoiceFieldLabel": Object {
                    "color": "var(--vscode-foreground)",
                    "opacity": 0.4,
                  },
                  ":after": Object {
                    "opacity": 0.4,
                  },
                  ":hover::before": Object {
                    "borderColor": "var(--vscode-editorWidget-border)",
                  },
                },
                ".ms-ChoiceField": Object {
                  "minHeight": 20,
                },
                ".ms-ChoiceField-field": Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                  "fontStyle": "normal",
                  "fontWeight": "normal",
                  "lineHeight": 18,
                  "margin": 0,
                },
                ".ms-ChoiceField-field.is-checked::after": Object {
                  "borderColor": "var(--vscode-input-foreground)",
                },
                ".ms-ChoiceField-field::after": Object {
                  "backgroundColor": "var(--vscode-input-background)",
                  "borderWidth": 4,
                  "height": 8,
                  "left": 5,
                  "top": 5,
                  "transition": "none",
                  "width": 8,
                },
                ".ms-ChoiceField-field::before": Object {
                  "backgroundColor": "var(--vscode-input-background)",
                  "borderColor": "var(--vscode-editorWidget-border)",
                  "height": 18,
                  "left": 0,
                  "top": 0,
                  "width": 18,
                },
                ".ms-ChoiceField-field:hover": Object {
                  "::after": Object {
                    "background": "transparent",
                    "borderColor": "transparent",
                  },
                  "::before": Object {
                    "borderColor": "var(--vscode-focusBorder)",
                  },
                  "span.ms-ChoiceFieldLabel": Object {
                    "color": "var(--vscode-foreground)",
                  },
                },
                ".ms-ChoiceField-input:focus": Object {
                  "opacity": 0,
                },
                ".ms-ChoiceField-wrapper.is-inFocus::after": Object {
                  "borderColor": "var(--vscode-focusBorder)",
                },
                ".ms-ChoiceFieldGroup label.ms-Label": Object {
                  "color": "var(--vscode-input-foreground)",
                  "fontSize": 13,
                  "fontStyle": "normal",
                  "fontWeight": "bold",
                  "lineHeight": 15,
                  "marginTop": 10,
                  "padding": 0,
                },
                ".ms-ChoiceFieldLabel": Object {
                  "paddingLeft": 26,
                },
                "label.ms-ChoiceField-field.is-checked:hover::after": Object {
                  "borderColor": "var(--vscode-input-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - required', () => {
        wrapper.setProps({
            required: true
        });
        const styles = (wrapper.find(ChoiceGroup).props().styles as IStyleFunction<{}, {}>)(
            {}
        ) as IChoiceGroupStyleProps;
        expect(styles).toMatchInlineSnapshot(`
            Object {
              "label": Object {
                "color": "var(--vscode-input-foreground)",
                "fontFamily": "var(--vscode-font-family)",
                "fontSize": "13px",
                "fontWeight": "bold",
                "padding": "4px 0",
                "selectors": Object {
                  "::after": Object {
                    "color": "var(--vscode-inputValidation-errorBorder)",
                    "content": "' *'",
                    "paddingRight": 12,
                  },
                },
              },
              "root": Object {
                ".is-disabled + .ms-ChoiceField-field": Object {
                  " .ms-ChoiceFieldLabel": Object {
                    "color": "var(--vscode-foreground)",
                    "opacity": 0.4,
                  },
                  ":after": Object {
                    "opacity": 0.4,
                  },
                  ":hover::before": Object {
                    "borderColor": "var(--vscode-editorWidget-border)",
                  },
                },
                ".ms-ChoiceField": Object {
                  "minHeight": 20,
                },
                ".ms-ChoiceField-field": Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                  "fontStyle": "normal",
                  "fontWeight": "normal",
                  "lineHeight": 18,
                  "margin": 0,
                },
                ".ms-ChoiceField-field.is-checked::after": Object {
                  "borderColor": "var(--vscode-input-foreground)",
                },
                ".ms-ChoiceField-field::after": Object {
                  "backgroundColor": "var(--vscode-input-background)",
                  "borderWidth": 4,
                  "height": 8,
                  "left": 5,
                  "top": 5,
                  "transition": "none",
                  "width": 8,
                },
                ".ms-ChoiceField-field::before": Object {
                  "backgroundColor": "var(--vscode-input-background)",
                  "borderColor": "var(--vscode-editorWidget-border)",
                  "height": 18,
                  "left": 0,
                  "top": 0,
                  "width": 18,
                },
                ".ms-ChoiceField-field:hover": Object {
                  "::after": Object {
                    "background": "transparent",
                    "borderColor": "transparent",
                  },
                  "::before": Object {
                    "borderColor": "var(--vscode-focusBorder)",
                  },
                  "span.ms-ChoiceFieldLabel": Object {
                    "color": "var(--vscode-foreground)",
                  },
                },
                ".ms-ChoiceField-input:focus": Object {
                  "opacity": 0,
                },
                ".ms-ChoiceField-wrapper.is-inFocus::after": Object {
                  "borderColor": "var(--vscode-focusBorder)",
                },
                ".ms-ChoiceFieldGroup label.ms-Label": Object {
                  "color": "var(--vscode-input-foreground)",
                  "fontSize": 13,
                  "fontStyle": "normal",
                  "fontWeight": "bold",
                  "lineHeight": 15,
                  "marginTop": 10,
                  "padding": 0,
                },
                ".ms-ChoiceFieldLabel": Object {
                  "paddingLeft": 26,
                },
                "label.ms-ChoiceField-field.is-checked:hover::after": Object {
                  "borderColor": "var(--vscode-input-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - inline', () => {
        wrapper.setProps({
            inline: true
        });
        const styles = (wrapper.find(ChoiceGroup).props().styles as IStyleFunction<{}, {}>)({}) as IChoiceGroupStyles;
        expect(styles.flexContainer).toMatchInlineSnapshot(
            {},
            `
            Object {
              "display": "flex",
              "flexDirection": "row",
              "flexWrap": "wrap",
              "selectors": Object {
                "> .ms-ChoiceField": Object {
                  "paddingRight": 16,
                },
              },
            }
        `
        );
    });
});
