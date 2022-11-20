import React from 'react';
import type { IIconProps, IIconStyles } from '@fluentui/react';
import { Icon } from '@fluentui/react';
import './UIIcon.scss';

/**
 * UIIcon component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/button
 *
 * @exports
 * @class UIIcon
 * @extends {React.Component<IIconProps, {}>}
 */
export class UIIcon extends React.Component<IIconProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IIconProps} props
     */
    public constructor(props: IIconProps) {
        super(props);
    }

    protected setStyle = (): IIconStyles => {
        return {};
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const className = this.props.className ? ` ${this.props.className}` : '';
        return <Icon {...this.props} className={`ts-icon${className}`} styles={this.setStyle()} />;
    }
}
