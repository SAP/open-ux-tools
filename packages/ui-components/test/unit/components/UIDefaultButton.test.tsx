import * as React from 'react';
import * as Enzyme from 'enzyme';
import { DefaultButton } from '@fluentui/react';
import { UIDefaultButton } from '../../../src/components/UIButton/UIDefaultButton';
import type { UIDefaultButtonProps } from '../../../src/components/UIButton/UIDefaultButton';
import { UiIcons } from '../../../src/components/Icons';

describe('<UIDefaultButton />', () => {
    let wrapper: Enzyme.ReactWrapper<UIDefaultButtonProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIDefaultButton>Dummy</UIDefaultButton>);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIDefaultButton component', () => {
        expect(wrapper.find('.ms-Button').length).toEqual(1);
    });

    it('Styles - primary', () => {
        wrapper.setProps({
            primary: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": 2,
              "color": "var(--vscode-button-foreground)",
              "fontFamily": "var(--vscode-font-family)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 22,
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
        wrapper.setProps({
            primary: true,
            checked: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": 2,
              "color": "var(--vscode-button-foreground)",
              "fontFamily": "var(--vscode-font-family)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 22,
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
        wrapper.setProps({
            primary: false
        });
        const styles = wrapper.find(DefaultButton).props().styles;
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-button-secondaryBackground)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": 2,
              "color": "var(--vscode-button-secondaryForeground)",
              "fontFamily": "var(--vscode-font-family)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 22,
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
              "borderColor": "var(--vscode-button-border, transparent)",
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
              "borderColor": "var(--vscode-button-border, transparent)",
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
        wrapper.setProps({
            primary: true,
            checked: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-button-border, transparent)",
              "borderRadius": 2,
              "color": "var(--vscode-button-foreground)",
              "fontFamily": "var(--vscode-font-family)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 22,
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

    it('Styles - transparent', () => {
        wrapper.setProps({
            transparent: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "transparent",
              "borderColor": "transparent",
              "borderRadius": 2,
              "color": "var(--vscode-foreground)",
              "fontFamily": "var(--vscode-font-family)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 22,
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
        wrapper.setProps({
            transparent: true,
            checked: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
        expect(styles?.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "transparent",
              "borderColor": "transparent",
              "borderRadius": 2,
              "color": "var(--vscode-foreground)",
              "fontFamily": "var(--vscode-font-family)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 22,
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
        it('Default render without icon', () => {
            expect(wrapper.find('[data-icon-name="ArrowDown"]').length).toEqual(0);
        });

        it('Render without icon', () => {
            wrapper.setProps({
                menuProps: undefined
            });
            expect(wrapper.find('[data-icon-name="ArrowDown"]').length).toEqual(0);
        });

        it('Render with default icon', () => {
            wrapper.setProps({
                menuProps: {
                    items: []
                }
            });
            expect(wrapper.find('[data-icon-name="ArrowDown"]').length).toEqual(1);
        });

        it('Render with custom icon', () => {
            wrapper.setProps({
                menuIconProps: {
                    iconName: UiIcons.ArrowUp
                }
            });
            expect(wrapper.find('[data-icon-name="ArrowDown"]').length).toEqual(0);
            expect(wrapper.find('[data-icon-name="ArrowUp"]').length).toEqual(1);
        });
    });
});
