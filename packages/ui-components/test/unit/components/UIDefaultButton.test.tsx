import * as React from 'react';
import Enzyme from 'enzyme';
import { render, fireEvent } from '@testing-library/react';
import type { IButton } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { UIDefaultButton } from '../../../src/components/UIButton/UIDefaultButton';
import type { UIDefaultButtonProps } from '../../../src/components/UIButton/UIDefaultButton';
import { UiIcons, initIcons } from '../../../src/components/Icons';

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
        wrapper.setProps({
            primary: true,
            checked: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
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
        wrapper.setProps({
            primary: false
        });
        const styles = wrapper.find(DefaultButton).props().styles;
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
        wrapper.setProps({
            primary: true,
            checked: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
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
        wrapper.setProps({
            alert: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
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
        wrapper.setProps({
            alert: true,
            checked: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
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
        wrapper.setProps({
            transparent: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
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
        wrapper.setProps({
            transparent: true,
            checked: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
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

    describe('propagateMenuOpenKeyDown', () => {
        const menuProps = { items: [{ key: 'item1', text: 'Item 1' }] };

        beforeAll(() => {
            initIcons();
        });

        it('calls preventDefault on Alt+Down by default', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(
                <UIDefaultButton menuProps={menuProps} onKeyDown={onKeyDown}>
                    Test
                </UIDefaultButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(true);
        });

        it('calls preventDefault on Alt+Down when propagateMenuOpenKeyDown is true', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(
                <UIDefaultButton menuProps={menuProps} propagateMenuOpenKeyDown={true} onKeyDown={onKeyDown}>
                    Test
                </UIDefaultButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(true);
        });

        it('does not call preventDefault on Alt+Down when propagateMenuOpenKeyDown is false', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(
                <UIDefaultButton menuProps={menuProps} propagateMenuOpenKeyDown={false} onKeyDown={onKeyDown}>
                    Test
                </UIDefaultButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(false);
        });

        it('does not call preventDefault for non-Alt+Down keys', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(
                <UIDefaultButton menuProps={menuProps} onKeyDown={onKeyDown}>
                    Test
                </UIDefaultButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'Enter' });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(false);
        });

        it('forwards onKeyDown when propagateMenuOpenKeyDown is false', () => {
            const onKeyDown = jest.fn();
            const { container } = render(
                <UIDefaultButton propagateMenuOpenKeyDown={false} onKeyDown={onKeyDown}>
                    Test
                </UIDefaultButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
        });
    });

    describe('componentRef', () => {
        const menuProps = { items: [{ key: 'item1', text: 'Item 1' }] };

        it('populates an external RefObject on mount', () => {
            const externalRef: React.RefObject<IButton> = React.createRef();
            render(<UIDefaultButton>Test</UIDefaultButton>);
            // Without external ref the internal ref is used — confirm component mounts fine
            expect(externalRef.current).toBeNull();

            const { unmount } = render(<UIDefaultButton componentRef={externalRef}>Test</UIDefaultButton>);
            expect(externalRef.current).not.toBeNull();
            unmount();
            expect(externalRef.current).toBeNull();
        });

        it('calls an external callback ref on mount and null on unmount', () => {
            const callbackRef = jest.fn();
            const { unmount } = render(<UIDefaultButton componentRef={callbackRef}>Test</UIDefaultButton>);
            expect(callbackRef).toHaveBeenCalledTimes(1);
            expect(callbackRef.mock.calls[0][0]).not.toBeNull();
            unmount();
            expect(callbackRef).toHaveBeenCalledTimes(2);
            expect(callbackRef.mock.calls[1][0]).toBeNull();
        });

        it('still calls preventDefault on Alt+Down when external componentRef is provided', () => {
            const externalRef: React.RefObject<IButton> = React.createRef();
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(
                <UIDefaultButton componentRef={externalRef} menuProps={menuProps} onKeyDown={onKeyDown}>
                    Test
                </UIDefaultButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(true);
        });
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
