import React from 'react';

import type { ILinkProps, ILinkStyles } from '@fluentui/react';
import { Link } from '@fluentui/react';

export interface UILinkProps extends ILinkProps {
    secondary?: boolean;
}

const linkStyle = {
    primary: {
        color: 'var(--vscode-textLink-foreground)',
        hoverColor: 'var(--vscode-textLink-activeForeground)'
    },
    secondary: {
        color: 'var(--vscode-foreground)',
        hoverColor: 'var(--vscode-foreground)'
    }
};

/**
 * UILink component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/link
 *
 * @exports
 * @class UILink
 * @extends {React.Component<UILinkProps, {}>}
 */
export class UILink extends React.Component<UILinkProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {UILinkProps} props
     */
    public constructor(props: UILinkProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const { secondary, underline, disabled } = this.props;
        const styles = secondary ? linkStyle.secondary : linkStyle.primary;
        const linkStyles = (): Partial<ILinkStyles> => {
            return {
                root: {
                    color: styles.color,
                    fontFamily: 'var(--vscode-font-family)',
                    textDecoration: underline === false ? undefined : 'underline',
                    selectors: !disabled
                        ? {
                              '&:hover, &:hover:focus, &:hover:active': {
                                  color: styles.hoverColor,
                                  textDecoration: underline === false ? 'underline' : 'none'
                              },
                              '&:active, &:focus': {
                                  color: styles.hoverColor,
                                  textDecoration: underline === false ? 'underline' : 'none',
                                  outline: 'none'
                              },
                              // Focus through tab navigation
                              '.ms-Fabric--isFocusVisible &:focus': {
                                  boxShadow: 'none',
                                  outline: '1px solid var(--vscode-focusBorder)',
                                  outlineOffset: '-1px'
                              }
                          }
                        : undefined,
                    opacity: disabled ? 0.4 : undefined
                }
            };
        };

        return <Link {...this.props} styles={linkStyles} />;
    }
}
