import * as React from 'react';
import { render } from '@testing-library/react';
import { UIDefaultButton } from '../../../src/components/UIButton/UIDefaultButton';
import type { UIDefaultButtonProps } from '../../../src/components/UIButton/UIDefaultButton';
import type { IButtonStyles } from '@fluentui/react';
import { UiIcons } from '../../../src/components/Icons';
import { initIcons } from '../../../src/components';

describe('<UIDefaultButton />', () => {
    /**
     * Computes the IButtonStyles that UIDefaultButton would pass to DefaultButton
     * by calling the protected `setStyle` method directly on a throw-away instance.
     */
    function getStyles(props: UIDefaultButtonProps): IButtonStyles {
        const instance = new UIDefaultButton(props) as unknown as {
            setStyle(p: UIDefaultButtonProps): IButtonStyles;
        };
        return instance.setStyle(props);
    }

    it('Should render a UIDefaultButton component', () => {
        const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
        expect(container.querySelectorAll('.ms-Button').length).toEqual(1);
    });

    it('Styles - primary', () => {
        const styles = getStyles({ primary: true });
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
              "color": "var(--vscode-button-foreground)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 26,
              "minHeight": 26,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `
        );
        expect(styles?.rootHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-hoverBackground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootDisabled).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "opacity": "0.5 !important",
            }
        `);
        expect(styles?.icon).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-button-foreground)",
              "height": 16,
              "lineHeight": 16,
              "marginLeft": -3,
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootChecked).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
            }
        `);
        expect(styles?.rootCheckedHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-hoverBackground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - primary and checked', () => {
        const styles = getStyles({ primary: true, checked: true });
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
              "color": "var(--vscode-button-foreground)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 26,
              "minHeight": 26,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `);
        expect(styles?.rootHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-hoverBackground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootDisabled).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "opacity": "0.5 !important",
            }
        `);
        expect(styles?.icon).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-button-foreground)",
              "height": 16,
              "lineHeight": 16,
              "marginLeft": -3,
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootChecked).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
            }
        `);
        expect(styles?.rootCheckedHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-hoverBackground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - secondary', () => {
        const styles = getStyles({ primary: false });
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-button-secondaryBackground)",
              "borderColor": "var(--vscode-button-secondaryBorder, var(--vscode-button-border, transparent))",
              "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
              "color": "var(--vscode-button-secondaryForeground)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 26,
              "minHeight": 26,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `
        );
        expect(styles?.rootHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-secondaryHoverBackground)",
              "borderColor": "var(--vscode-button-secondaryBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-secondaryForeground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-secondaryForeground)",
                },
              },
            }
        `);
        expect(styles?.rootDisabled).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-secondaryBackground)",
              "borderColor": "var(--vscode-button-secondaryBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-secondaryForeground)",
              "opacity": "0.5 !important",
            }
        `);
        expect(styles?.icon).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-button-secondaryForeground)",
              "height": 16,
              "lineHeight": 16,
              "marginLeft": -3,
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-secondaryForeground)",
                },
              },
            }
        `);
        expect(styles?.rootChecked).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-secondaryBackground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-secondaryForeground)",
            }
        `);
        expect(styles?.rootCheckedHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-secondaryHoverBackground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-secondaryForeground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-secondaryForeground)",
                },
              },
            }
        `);
    });

    it('Styles - secondary and checked', () => {
        const styles = getStyles({ primary: true, checked: true });
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
              "color": "var(--vscode-button-foreground)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 26,
              "minHeight": 26,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `);
        expect(styles?.rootHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-hoverBackground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootDisabled).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "opacity": "0.5 !important",
            }
        `);
        expect(styles?.icon).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-button-foreground)",
              "height": 16,
              "lineHeight": 16,
              "marginLeft": -3,
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootChecked).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
            }
        `);
        expect(styles?.rootCheckedHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-hoverBackground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - alert', () => {
        const styles = getStyles({ alert: true });
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-errorForeground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
              "color": "var(--vscode-button-foreground)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 26,
              "minHeight": 26,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `
        );
        expect(styles?.rootHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-editorError-foreground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootDisabled).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-errorForeground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "opacity": "0.5 !important",
            }
        `);
        expect(styles?.icon).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-button-foreground)",
              "height": 16,
              "lineHeight": 16,
              "marginLeft": -3,
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootChecked).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-errorForeground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
            }
        `);
        expect(styles?.rootCheckedHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-editorError-foreground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - alert and checked', () => {
        const styles = getStyles({ alert: true, checked: true });
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-errorForeground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
              "color": "var(--vscode-button-foreground)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 26,
              "minHeight": 26,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `);
        expect(styles?.rootHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-editorError-foreground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootDisabled).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-errorForeground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "color": "var(--vscode-button-foreground)",
              "opacity": "0.5 !important",
            }
        `);
        expect(styles?.icon).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-button-foreground)",
              "height": 16,
              "lineHeight": 16,
              "marginLeft": -3,
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootChecked).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-errorForeground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
            }
        `);
        expect(styles?.rootCheckedHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-editorError-foreground)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - transparent', () => {
        const styles = getStyles({ transparent: true });
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "transparent",
              "borderColor": "transparent",
              "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
              "color": "var(--vscode-foreground)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 26,
              "minHeight": 26,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `);
        expect(styles?.rootHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-toolbar-hoverBackground, var(--vscode-menubar-selectionBackground))",
              "borderColor": "var(--vscode-contrastActiveBorder, transparent)",
              "borderStyle": "dashed",
              "color": "var(--vscode-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootDisabled).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "transparent",
              "borderColor": "transparent",
              "color": "var(--vscode-foreground)",
              "opacity": "0.5 !important",
            }
        `);
        expect(styles?.icon).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-foreground)",
              "height": 16,
              "lineHeight": 16,
              "marginLeft": -3,
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootChecked).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "borderStyle": "solid",
              "color": "var(--vscode-button-foreground)",
            }
        `);
        expect(styles?.rootCheckedHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
    });

    it('Styles - transparent and checked', () => {
        const styles = getStyles({ transparent: true, checked: true });
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "transparent",
              "borderColor": "transparent",
              "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
              "color": "var(--vscode-foreground)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 26,
              "minHeight": 26,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `);
        expect(styles?.rootHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-toolbar-hoverBackground, var(--vscode-menubar-selectionBackground))",
              "borderColor": "var(--vscode-contrastActiveBorder, transparent)",
              "borderStyle": "dashed",
              "color": "var(--vscode-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootDisabled).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "transparent",
              "borderColor": "transparent",
              "color": "var(--vscode-foreground)",
              "opacity": "0.5 !important",
            }
        `);
        expect(styles?.icon).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-foreground)",
              "height": 16,
              "lineHeight": 16,
              "marginLeft": -3,
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-foreground)",
                },
              },
            }
        `);
        expect(styles?.rootChecked).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "borderStyle": "solid",
              "color": "var(--vscode-button-foreground)",
            }
        `);
        expect(styles?.rootCheckedHovered).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))",
              "color": "var(--vscode-button-foreground)",
              "selectors": Object {
                "svg > path, svg > rect": Object {
                  "fill": "var(--vscode-button-foreground)",
                },
              },
            }
        `);
    });

    describe('Menu', () => {
        beforeAll(() => {
            initIcons();
        });

        it('Default render without icon', () => {
            const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
            expect(container.querySelectorAll('[data-icon-name="ArrowDown"]').length).toEqual(0);
        });

        it('Render without icon', () => {
            const { container } = render(<UIDefaultButton menuProps={undefined}>Dummy</UIDefaultButton>);
            expect(container.querySelectorAll('[data-icon-name="ArrowDown"]').length).toEqual(0);
        });

        it('Render with default icon', () => {
            const { container } = render(<UIDefaultButton menuProps={{ items: [] }}>Dummy</UIDefaultButton>);
            expect(container.querySelectorAll('[data-icon-name="ArrowDown"]').length).toEqual(1);
        });

        it('Render with custom icon', () => {
            const { container } = render(
                <UIDefaultButton menuIconProps={{ iconName: UiIcons.ArrowUp }}>Dummy</UIDefaultButton>
            );
            expect(container.querySelectorAll('[data-icon-name="ArrowDown"]').length).toEqual(0);
            expect(container.querySelectorAll('[data-icon-name="ArrowUp"]').length).toEqual(1);
        });
    });
});
