import * as React from 'react';
import { render } from '@testing-library/react';
import type { ILinkStyles } from '@fluentui/react';
import type { UILinkProps } from '../../../src/components/UILink';
import { UILink } from '../../../src/components/UILink';

class UILinkTestHelper extends UILink {
    public callLinkStyles(): Partial<ILinkStyles> {
        const element = this.render() as React.ReactElement;
        return (element.props.styles as () => Partial<ILinkStyles>)();
    }
}

describe('<UILink />', () => {
    it('Should render a UILink component', () => {
        const { container } = render(<UILink>Dummy</UILink>);
        expect(container.querySelector('.ms-Link')).toBeInTheDocument();
    });

    it('Styles - primary', () => {
        const helper = new UILinkTestHelper({ children: 'Dummy' });
        const styles = helper.callLinkStyles();
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
        const helper = new UILinkTestHelper({ children: 'Dummy', secondary: true });
        const styles = helper.callLinkStyles();
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
        const helper = new UILinkTestHelper({ children: 'Dummy', underline: false });
        const styles = helper.callLinkStyles();
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
        const helper = new UILinkTestHelper({ children: 'Dummy', disabled: true });
        const styles = helper.callLinkStyles();
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
