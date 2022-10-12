import React from 'react';
import type { ITextField } from '../UIInput';
import { UITextInput } from '../UIInput';
import { UIIcon } from '../UIIcon';
import { UiIcons } from '../Icons';

import './UIDatePicker.scss';

export type UIDatePickerProps = {
    componentRef?: React.RefObject<ITextField>;
    errorMessage?: string | JSX.Element;
    defaultValue?: string;
    dateOnly?: boolean;
    onChange?: (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue: string) => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
    onClick?: (event: React.MouseEvent) => void;
};

/**
 * UIDatePicker component.
 *
 * @exports
 * @class {UIDatePicker}
 * @extends {React.Component<UIDatePickerProps>}
 */
export class UIDatePicker extends React.Component<UIDatePickerProps> {
    state = {
        value: ''
    };

    private readonly dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    private readonly dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

    /**
     * Initializes component properties.
     *
     * @param {UIDatePickerProps} props
     */
    public constructor(props: UIDatePickerProps) {
        super(props);

        this.state.value = props.defaultValue || '';

        this.onInputChange = this.onInputChange.bind(this);
        this.onPickerChange = this.onPickerChange.bind(this);
    }

    /**
     * On input change event.
     *
     * @param {React.FormEvent<HTMLInputElement | HTMLTextAreaElement>} e
     * @param {string} newValue
     */
    private onInputChange(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue = '') {
        newValue = newValue.trim();
        this.props.onChange?.(e, newValue);
        this.setState({ value: newValue });
    }

    /**
     * On Date picker change.
     *
     * @param {React.FormEvent<HTMLInputElement | HTMLTextAreaElement>} e
     */
    private onPickerChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        let newValue = e.target.value;
        if (!this.props.dateOnly && !this.dateTimeRegex.test(newValue)) {
            newValue = `${e.target.value}:00`;
        }
        this.props.onChange?.(e, newValue);
        this.setState({ value: newValue });
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const isFormat = this.dateRegex.test(this.state.value) || this.dateTimeRegex.test(this.state.value);

        return (
            <div className="ui-DatePicker" onKeyDown={this.props.onKeyDown} onClick={this.props.onClick}>
                <UITextInput
                    componentRef={this.props.componentRef}
                    errorMessage={this.props.errorMessage}
                    value={this.state.value}
                    onChange={this.onInputChange}
                />
                <div className="ui-DatePicker-toggle">
                    <UIIcon iconName={UiIcons.Calendar} />
                    <input
                        type={this.props.dateOnly ? 'date' : 'datetime-local'}
                        step="1"
                        value={isFormat ? this.state.value : ''}
                        onChange={this.onPickerChange}
                    />
                </div>
            </div>
        );
    }
}
