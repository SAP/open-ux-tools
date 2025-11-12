import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { DefaultButton } from '@fluentui/react';
import { UIDefaultButton } from '../../../src/components/UIButton/UIDefaultButton';
import type { UIDefaultButtonProps } from '../../../src/components/UIButton/UIDefaultButton';
import { UiIcons } from '../../../src/components/Icons';

describe('<UIDefaultButton />', () => {
    it('Should render a UIDefaultButton component', () => {
        const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
        expect(container.querySelector('.ms-Button')).toBeInTheDocument();
        expect(screen.getByText('Dummy')).toBeInTheDocument();
    });

    it('Styles - primary', () => {
        const { container } = render(<UIDefaultButton primary={true}>Dummy</UIDefaultButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('ms-Button--primary');
    });

    it('Styles - primary and checked', () => {
        const { container } = render(
            <UIDefaultButton primary={true} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('ms-Button--primary');
        expect(button).toHaveClass('is-checked');
    });

    it('Styles - secondary', () => {
        const { container } = render(<UIDefaultButton primary={false}>Dummy</UIDefaultButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('ms-Button--primary');
    });

    it('Styles - secondary and checked', () => {
        const { container } = render(
            <UIDefaultButton primary={false} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('ms-Button--primary');
        expect(button).toHaveClass('is-checked');
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
              "borderRadius": 2,
              "color": "var(--vscode-button-foreground)",
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
              "borderRadius": 2,
              "color": "var(--vscode-button-foreground)",
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
        const { container } = render(<UIDefaultButton transparent={true}>Dummy</UIDefaultButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(screen.getByText('Dummy')).toBeInTheDocument();
    });

    it('Styles - transparent and checked', () => {
        const { container } = render(
            <UIDefaultButton transparent={true} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('is-checked');
        expect(screen.getByText('Dummy')).toBeInTheDocument();
    });

    describe('Menu', () => {
        it('Default render without icon', () => {
            const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
            expect(container.querySelector('[data-icon-name="ArrowDown"]')).not.toBeInTheDocument();
        });

        it('Render without icon', () => {
            const { container } = render(<UIDefaultButton menuProps={undefined}>Dummy</UIDefaultButton>);
            expect(container.querySelector('[data-icon-name="ArrowDown"]')).not.toBeInTheDocument();
        });

        it('Render with default icon', () => {
            const { container } = render(<UIDefaultButton menuProps={{ items: [] }}>Dummy</UIDefaultButton>);
            expect(container.querySelector('[data-icon-name="ArrowDown"]')).toBeInTheDocument();
        });

        it('Render with custom icon', () => {
            const { container } = render(
                <UIDefaultButton menuIconProps={{ iconName: UiIcons.ArrowUp }}>Dummy</UIDefaultButton>
            );
            expect(container.querySelector('[data-icon-name="ArrowDown"]')).not.toBeInTheDocument();
            expect(container.querySelector('[data-icon-name="ArrowUp"]')).toBeInTheDocument();
        });
    });
});
