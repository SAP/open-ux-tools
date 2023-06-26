import React from 'react';

import type { IVerticalDividerProps, IVerticalDividerStyles } from '@fluentui/react';
import { VerticalDivider } from '@fluentui/react';

/**
 * UIVerticalDivider component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/verticalDivider
 *
 * @exports
 * @class UIVerticalDivider
 * @extends {React.Component<IVerticalDividerProps, {}>}
 */
export class UIVerticalDivider extends React.Component<IVerticalDividerProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IVerticalDividerProps} props
     */
    public constructor(props: IVerticalDividerProps) {
        super(props);
    }

    protected setStyle = (): IVerticalDividerStyles => {
        return {
            wrapper: {},
            divider: {
                backgroundColor: 'var(--vscode-editorWidget-border)'
            }
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <VerticalDivider {...this.props} styles={this.setStyle()} />;
    }
}
