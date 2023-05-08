import React from 'react';

import type { ISeparatorProps, ISeparatorStyleProps, ISeparatorStyles } from '@fluentui/react';
import { Separator } from '@fluentui/react';

export type UISeparatorProps = ISeparatorProps;
/**
 * UISeparator component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/separator
 *
 * @exports
 * @class UISeparator
 * @extends {React.Component<ISeparatorProps, {}>}
 */
export class UISeparator extends React.Component<ISeparatorProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {ISeparatorProps} props The props
     */
    public constructor(props: ISeparatorProps) {
        super(props);
    }

    /**
     * Render the component.
     *
     * @returns {JSX.Element} return a rendered component
     */
    render(): JSX.Element {
        const separatorStyles = (props: ISeparatorStyleProps): Partial<ISeparatorStyles> => ({
            ...{
                root: [
                    {
                        height: '100%',
                        width: 1,
                        padding: '0 10px',
                        selectors: {
                            ':before': {
                                backgroundColor: 'var(--vscode-editorWidget-border)',
                                top: 1,
                                bottom: 1
                            }
                        }
                    },
                    props.vertical && {
                        height: '100%',
                        width: 1,
                        padding: '0 10px',
                        selectors: {
                            ':after': {
                                backgroundColor: 'var(--vscode-editorWidget-border)',
                                top: 1,
                                bottom: 1
                            }
                        }
                    }
                ]
            }
        });

        return <Separator {...this.props} styles={separatorStyles} />;
    }
}
