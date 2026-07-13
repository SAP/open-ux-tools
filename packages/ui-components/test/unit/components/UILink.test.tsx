import * as React from 'react';
import { render } from '@testing-library/react';
import type { ILinkStyles } from '@fluentui/react';

let capturedStyles: (() => Partial<ILinkStyles>) | undefined;

// In ESM mode (--experimental-vm-modules + ts-jest useESM), jest.mock() is NOT
// hoisted. Use jest.unstable_mockModule so the mock is registered before the
// module under test is dynamically imported below.
jest.unstable_mockModule('@fluentui/react', () => {
    const actual = jest.requireActual('@fluentui/react') as Record<string, unknown>;
    return {
        ...actual,
        Link: (props: React.PropsWithChildren<{ styles?: () => Partial<ILinkStyles> }>) => {
            capturedStyles = props.styles;
            return <a className="ms-Link">{props.children}</a>;
        }
    };
});

// Dynamic import AFTER mock registration — required in ESM mode.
const { UILink } = await import('../../../src/components/UILink');

describe('<UILink />', () => {
    beforeEach(() => {
        capturedStyles = undefined;
    });

    const getStyles = (): ILinkStyles => {
        return capturedStyles!() as ILinkStyles;
    };

    it('Should render a UILink component', () => {
        const { container } = render(<UILink>Dummy</UILink>);
        expect(container.querySelectorAll('.ms-Link').length).toEqual(1);
    });

    it('Styles - primary', () => {
        render(<UILink>Dummy</UILink>);
        const styles = getStyles();
        expect(styles.root).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-textLink-foreground)",
              "opacity": undefined,
              "selectors": Object {
                "&:active, &:focus": Object {
                  "color": "var(--vscode-textLink-activeForeground)",
                  "outline": "none",
                  "textDecoration": "none",
                },
                "&:hover, &:hover:focus, &:hover:active": Object {
                  "color": "var(--vscode-textLink-activeForeground)",
                  "textDecoration": "none",
                },
                ".ms-Fabric--isFocusVisible &:focus": Object {
                  "boxShadow": "none",
                  "outline": "1px solid var(--vscode-focusBorder)",
                  "outlineOffset": "-1px",
                },
              },
              "textDecoration": "underline",
            }
        `);
    });

    it('Styles - secondary', () => {
        const { rerender } = render(<UILink>Dummy</UILink>);
        rerender(<UILink secondary={true}>Dummy</UILink>);
        const styles = getStyles();
        expect(styles.root).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-foreground)",
              "opacity": undefined,
              "selectors": Object {
                "&:active, &:focus": Object {
                  "color": "var(--vscode-foreground)",
                  "outline": "none",
                  "textDecoration": "none",
                },
                "&:hover, &:hover:focus, &:hover:active": Object {
                  "color": "var(--vscode-foreground)",
                  "textDecoration": "none",
                },
                ".ms-Fabric--isFocusVisible &:focus": Object {
                  "boxShadow": "none",
                  "outline": "1px solid var(--vscode-focusBorder)",
                  "outlineOffset": "-1px",
                },
              },
              "textDecoration": "underline",
            }
        `);
    });

    it('Styles - primary with no underline', () => {
        const { rerender } = render(<UILink>Dummy</UILink>);
        rerender(<UILink underline={false}>Dummy</UILink>);
        const styles = getStyles();
        expect(styles.root).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-textLink-foreground)",
              "opacity": undefined,
              "selectors": Object {
                "&:active, &:focus": Object {
                  "color": "var(--vscode-textLink-activeForeground)",
                  "outline": "none",
                  "textDecoration": "underline",
                },
                "&:hover, &:hover:focus, &:hover:active": Object {
                  "color": "var(--vscode-textLink-activeForeground)",
                  "textDecoration": "underline",
                },
                ".ms-Fabric--isFocusVisible &:focus": Object {
                  "boxShadow": "none",
                  "outline": "1px solid var(--vscode-focusBorder)",
                  "outlineOffset": "-1px",
                },
              },
              "textDecoration": undefined,
            }
        `);
    });

    it('Styles - disabled', () => {
        const { rerender } = render(<UILink>Dummy</UILink>);
        rerender(<UILink disabled={true}>Dummy</UILink>);
        const styles = getStyles();
        expect(styles.root).toMatchInlineSnapshot(`
            Object {
              "color": "var(--vscode-textLink-foreground)",
              "opacity": 0.4,
              "selectors": undefined,
              "textDecoration": "underline",
            }
        `);
    });
});
