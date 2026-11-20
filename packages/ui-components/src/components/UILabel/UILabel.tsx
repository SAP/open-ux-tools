import React from 'react';

import type { ILabelProps, ILabelStyleProps, ILabelStyles } from '@fluentui/react';
import { Label } from '@fluentui/react';
import { REQUIRED_LABEL_INDICATOR } from '../types.js';

export type UILabelProps = ILabelProps;

export const labelGlobalStyle = {
    fontWeight: 'bold',
    fontSize: '13px',
    color: 'var(--vscode-input-foreground)',
    padding: 'var(--ui-spacing-small, 5px) 0'
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
                            marginTop: 'calc(var(--ui-spacing-xl, 20px) + var(--ui-spacing-small, 5px))',
                            ...labelGlobalStyle
                        },
                        props.disabled && {
                            opacity: '0.4'
                        },
                        props.required && {
                            selectors: {
                                '::after': {
                                    content: REQUIRED_LABEL_INDICATOR,
                                    color: 'var(--vscode-inputValidation-errorBorder)',
                                    paddingRight: 'var(--ui-spacing-medium, 10px)'
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
