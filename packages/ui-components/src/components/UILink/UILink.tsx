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
        const { secondary } = this.props;
        const styles = secondary ? linkStyle.secondary : linkStyle.primary;
        const linkStyles = (): Partial<ILinkStyles> => {
            return {
                root: {
                    color: styles.color,
                    fontFamily: 'var(--vscode-font-family)',
                    textDecoration: 'underline',
                    selectors: {
                        '&:hover, &:hover:focus, &:hover:active': {
                            color: styles.hoverColor,
                            textDecoration: 'none'
                        },
                        '&:active, &:focus': {
                            color: styles.hoverColor,
                            textDecoration: 'none',
                            outline: 'none'
                        },
                        // Focus through tab navigation
                        '.ms-Fabric--isFocusVisible &:focus': {
                            boxShadow: 'none',
                            outline: '1px solid var(--vscode-focusBorder)',
                            outlineOffset: '-1px'
                        }
                    }
                }
            };
        };

        return <Link {...this.props} styles={linkStyles} />;
    }
}
