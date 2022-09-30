import React from 'react';

import type { ILinkProps, ILinkStyles } from '@fluentui/react';
import { Link } from '@fluentui/react';

/**
 * UILink component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/link
 *
 * @exports
 * @class UILink
 * @extends {React.Component<ILinkProps, {}>}
 */
export class UILink extends React.Component<ILinkProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {ILinkProps} props
     */
    public constructor(props: ILinkProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const linkStyles = (): Partial<ILinkStyles> => {
            return {
                root: {
                    color: 'var(--vscode-textLink-foreground)',
                    fontFamily: 'var(--vscode-font-family)',
                    selectors: {
                        '&:hover, &:hover:focus, &:hover:active': {
                            color: 'var(--vscode-textLink-activeForeground)',
                            textDecoration: 'underline'
                        },
                        '&:active, &:focus': {
                            color: 'var(--vscode-textLink-activeForeground)',
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
