import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IStyleFunction, ILinkStyles } from '@fluentui/react';
import { Link } from '@fluentui/react';
import type { UILinkProps } from '../../../src/components/UILink';
import { UILink } from '../../../src/components/UILink';

describe('<UILink />', () => {
    let wrapper: Enzyme.ReactWrapper<UILinkProps>;

    const getStyles = (): ILinkStyles => {
        return (wrapper.find(Link).props().styles as IStyleFunction<{}, {}>)({}) as ILinkStyles;
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(<UILink>Dummy</UILink>);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UILink component', () => {
        expect(wrapper.find('.ms-Link').length).toEqual(1);
    });

    it('Styles - primary', () => {
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
        wrapper.setProps({
            secondary: true
        });
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
        wrapper.setProps({
            underline: false
        });
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
        wrapper.setProps({
            disabled: true
        });
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
