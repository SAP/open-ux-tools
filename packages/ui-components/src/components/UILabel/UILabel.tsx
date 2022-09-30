import React from 'react';

import type { ILabelProps, ILabelStyleProps, ILabelStyles } from '@fluentui/react';
import { Label } from '@fluentui/react';

export type UILabelProps = ILabelProps;

export const labelGlobalStyle = {
    fontWeight: 'bold',
    fontSize: '13px',
    color: 'var(--vscode-input-foreground)',
    fontFamily: 'var(--vscode-font-family)',
    padding: '4px 0'
};

/**
 * UILabel component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/label
 *
 * @exports
 * @class UILabel
 * @extends {React.Component<ILabelProps, {}>}
 */
export class UILabel extends React.Component<UILabelProps> {
    /**
     * Initializes component properties.
     *
     * @param {UILabelProps} props
     */
    public constructor(props: UILabelProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const labelStyles = (props: ILabelStyleProps): Partial<ILabelStyles> => {
            return {
                ...{
                    root: [
                        {
                            marginTop: 25,
                            ...labelGlobalStyle
                        },
                        props.disabled && {
                            opacity: '0.4'
                        },
                        props.required && {
                            selectors: {
                                '::after': {
                                    content: `' *'`,
                                    color: 'var(--vscode-inputValidation-errorBorder)',
                                    paddingRight: 12
                                }
                            }
                        }
                    ]
                }
            };
        };

        return <Label {...this.props} styles={labelStyles} />;
    }
}
