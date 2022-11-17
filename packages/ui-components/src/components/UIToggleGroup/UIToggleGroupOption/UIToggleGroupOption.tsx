import * as React from 'react';

import { UIIcon } from '../../UIIcon';
import { getUIId } from '../../../utilities';

import type { UIToggleGroupOptionProps } from './UIToggleGroupOption.types';

import './UIToggleGroupOption.scss';

/**
 * UIToggleGroupOption component
 *
 * @exports
 * @class UIToggleGroupOption
 * @extends {React.Component<UIToggleGroupOptionProps, {}>}
 */
export class UIToggleGroupOption extends React.Component<UIToggleGroupOptionProps> {
    /**
     * Initializes component properties.
     *
     * @param {UIToggleGroupOptionProps} props
     */
    public constructor(props: UIToggleGroupOptionProps) {
        super(props);

        this.onClick = this.onClick.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    public onClick = (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
        this.props.onClick?.(evt, this.props);
    };

    public onBlur = (evt: React.FocusEvent<HTMLButtonElement>) => {
        this.props.onBlur?.(evt, this.props);
    };

    public onFocus = (evt: React.FocusEvent<HTMLButtonElement>) => {
        this.props.onFocus?.(evt, this.props);
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const labelId = this.props.labelId ? this.props.labelId : getUIId('ui-toggle-group-option-');

        return (
            <button
                role="button"
                {...(this.props.title && { title: this.props.title })}
                data-is-focusable="true"
                className={[
                    'ui-toggle-group-option',
                    this.props.focused ? 'ui-toggle-group-option--focused' : '',
                    this.props.selected ? 'ui-toggle-group-option--selected' : '',
                    this.props.disabled ? 'ui-toggle-group-option--disabled' : ''
                ]
                    .filter((x) => !!x)
                    .join(' ')}
                {...(this.props.ariaLabel && { 'aria-labelledby': labelId })}
                disabled={this.props.disabled || false}
                onClick={this.onClick}
                onFocus={this.onFocus}
                onBlur={this.onBlur}>
                <span className="ui-toggle-group-option-content" tabIndex={-1}>
                    {this.props.text && (
                        <span
                            id={labelId}
                            className="ui-toggle-group-option-content-text"
                            {...(this.props.ariaLabel && { 'aria-label': this.props.ariaLabel })}>
                            {this.props.text}
                        </span>
                    )}
                    {this.props.icon && (
                        <UIIcon className="ui-toggle-group-option-content-icon" iconName={this.props.icon} />
                    )}
                </span>
            </button>
        );
    }
}
