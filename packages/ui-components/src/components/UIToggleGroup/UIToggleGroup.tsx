import * as React from 'react';

import { UIToggleGroupOption } from './UIToggleGroupOption';
import { UILabel } from '../UILabel';
import { UIFocusZone, UIFocusZoneDirection } from '../UIFocusZone';
import { getUIId } from '../../utilities';

import type { UIToggleGroupProps, ToggleGroupOption } from './UIToggleGroup.types';
import type { UIToggleGroupOptionProps } from './UIToggleGroupOption/UIToggleGroupOption.types';

import './UIToggleGroup.scss';

interface UIToggleGroupState {
    options: ToggleGroupOption[];
}

/**
 * UIToggleGroup component.
 *
 * @exports
 * @class UIToggleGroup
 * @extends {React.Component<UIToggleGroupProps, UIToggleGroupState>}
 */
export class UIToggleGroup extends React.Component<UIToggleGroupProps, UIToggleGroupState> {
    labelId = this.props.labelId ? this.props.labelId : getUIId('ui-toggle-group-option-');

    /**
     * Initializes component properties.
     *
     * @param {UIToggleGroupProps} props
     */
    public constructor(props: UIToggleGroupProps) {
        super(props);

        this.state = {
            options: this.props.options.map((entry: ToggleGroupOption) => {
                if (entry.key === this.props.selectedKey) {
                    return {
                        ...entry,
                        selected: true
                    };
                } else {
                    return {
                        ...entry
                    };
                }
            })
        };

        this.onClick = this.onClick.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    public onClick = (
        _evt: React.MouseEvent<HTMLButtonElement, MouseEvent>,
        option?: UIToggleGroupOptionProps
    ): void => {
        let isSelected = false;

        if (option && option.itemKey) {
            this.setState({
                options: this.state.options.map(
                    (entry: ToggleGroupOption, index: number, options: ToggleGroupOption[]) => {
                        if (entry.key === option.itemKey) {
                            isSelected = !options[index].selected;
                            return {
                                ...entry,
                                selected: isSelected,
                                focused: options[index].focused
                            };
                        } else {
                            return {
                                ...entry,
                                selected: false,
                                focused: false
                            };
                        }
                    }
                )
            });

            if (this.props.onChange) {
                this.props.onChange?.(option.itemKey, isSelected);
            }
        }
    };

    public onFocus = (_evt: React.FocusEvent<HTMLButtonElement>, option?: UIToggleGroupOptionProps): void => {
        if (option && option.itemKey) {
            this.setState({
                options: this.state.options.map((entry: ToggleGroupOption) => {
                    if (entry.key === option.itemKey) {
                        return {
                            ...entry,
                            focused: true
                        };
                    } else {
                        return {
                            ...entry,
                            focused: false
                        };
                    }
                })
            });
        }
    };

    public onBlur = (_evt: React.FocusEvent<HTMLButtonElement>, _option?: UIToggleGroupOptionProps): void => {
        this.setState({
            options: this.state.options.map((entry: ToggleGroupOption) => {
                return {
                    ...entry,
                    focused: false
                };
            })
        });
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return (
            <div
                className="ui-toggle-group"
                role="group"
                {...(this.props.ariaLabel && { 'aria-labelledby': this.labelId })}>
                {this.props.label && (
                    <UILabel
                        id={this.labelId}
                        {...(this.props.ariaLabel && { 'aria-label': this.props.ariaLabel })}
                        className="ui-toggle-group-label"
                        required={this.props.required}
                        disabled={this.props.disabled}>
                        {this.props.label}
                    </UILabel>
                )}

                <UIFocusZone
                    as="div"
                    direction={UIFocusZoneDirection.horizontal}
                    isCircularNavigation={true}
                    shouldRaiseClicks={true}
                    className="ui-toggle-group-container"
                    role="list">
                    {this.state.options.map((option: ToggleGroupOption) => {
                        return (
                            <UIToggleGroupOption
                                itemKey={option.key}
                                {...option}
                                key={option.key}
                                onClick={this.onClick}
                                onFocus={this.onFocus}
                                onBlur={this.onBlur}
                                selected={option.selected}
                                disabled={option.disabled || this.props.disabled}
                            />
                        );
                    })}
                </UIFocusZone>
            </div>
        );
    }
}
