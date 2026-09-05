import * as React from 'react';
import { render } from '@testing-library/react';
import type { IChoiceGroupStyles } from '@fluentui/react';
import { UIChoiceGroup } from '../../../src/components/UIChoiceGroup/UIChoiceGroup';

describe('<UIChoiceGroup />', () => {
    it('Should render a UIChoiceGroup component', () => {
        const { container } = render(<UIChoiceGroup />);
        expect(container.querySelectorAll('.ms-ChoiceFieldGroup')).toHaveLength(1);
    });

    describe('Styles', () => {
        const getStyles = (props: ConstructorParameters<typeof UIChoiceGroup>[0] = {}): Partial<IChoiceGroupStyles> =>
            new UIChoiceGroup(props).setStyles();

        it('root styles are constant', () => {
            expect(getStyles().root).toMatchInlineSnapshot(`
                Object {
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
                }
            `);
        });

        it('label - default', () => {
            const label = getStyles().label as Record<string, unknown>;
            expect(label.opacity).toBeUndefined();
            expect(label.selectors).toBeUndefined();
        });

        it('label - disabled adds opacity', () => {
            const label = getStyles({ disabled: true }).label as Record<string, unknown>;
            expect(label.opacity).toEqual(0.4);
        });

        it('label - required adds ::after indicator', () => {
            const label = getStyles({ required: true }).label as Record<string, unknown>;
            expect((label.selectors as Record<string, unknown>)?.['::after']).toMatchObject({
                color: 'var(--vscode-inputValidation-errorBorder)'
            });
        });

        it('inline adds flexContainer', () => {
            const styles = getStyles({ inline: true });
            expect(styles.flexContainer).toMatchObject({
                display: 'flex',
                flexDirection: 'row'
            });
        });

        it('flexContainer absent when not inline', () => {
            expect(getStyles().flexContainer).toBeUndefined();
        });
    });
});
