import React from 'react';
import type { FC } from 'react';

import type {
    DropdownIndicatorProps,
    ClearIndicatorProps,
    LoadingIndicatorProps,
    OptionProps,
    ActionMeta,
    MultiValue,
    Options,
    OptionsOrGroups,
    GetOptionLabel,
    GetOptionValue
} from 'react-select';
import type { CreatableProps } from 'react-select/creatable';
import { components, SelectInstance } from 'react-select';
import CreatableSelect from 'react-select/creatable';

import { UIIcon } from '../UIIcon';
import { UILoader } from '../UILoader';
import { UIHighlightMenuOption } from '../UIContextualMenu';

import './UICreateSelect.scss';
import { COMMON_INPUT_STYLES } from '../UIInput';

export { MultiValue as UICreateSelectMultiValue };
export { ActionMeta as UICreateSelectActionMeta };
export { Options as UICreateSelectOptions };
export { OptionsOrGroups as UICreateSelectOptionsOrGroups };
export { SelectInstance as UICreateSelectInstance };

export interface UICreateSelectOptionEntry {
    readonly label: string;
    readonly value: string;
    __isNew__?: boolean;
}

export interface UICreateSelectGroupEntry {
    readonly options: readonly UICreateSelectOptionEntry[];
    readonly label?: string;
}

export interface UICreateSelectAccessors<Option> {
    getOptionValue: GetOptionValue<Option>;
    getOptionLabel: GetOptionLabel<Option>;
}

type CreateSelectProps = {
    createText?: string;
    creatableRef?: React.MutableRefObject<SelectInstance<
        UICreateSelectOptionEntry,
        true,
        UICreateSelectGroupEntry
    > | null>;
};

export type UICreateSelectProps = CreateSelectProps &
    CreatableProps<UICreateSelectOptionEntry, true, UICreateSelectGroupEntry>;

/**
 * Return a custom dropdown indicator component to be used in the select component.
 *
 * @param {DropdownIndicatorProps<UICreateSelectOptionEntry>} props
 * @returns {JSX.Element}
 */
const DropdownIndicator = (props: DropdownIndicatorProps<UICreateSelectOptionEntry, true>): JSX.Element => {
    return (
        <components.DropdownIndicator {...props}>
            <UIIcon className="ui-create-select-indicator-dropdown" iconName="ArrowDown" />
        </components.DropdownIndicator>
    );
};

/**
 * Return a custom clear indicator component to be used in the select component.
 *
 * @param {ClearIndicatorProps<UICreateSelectOptionEntry, true>} props
 * @returns {JSX.Element}
 */
const ClearIndicator = (props: ClearIndicatorProps<UICreateSelectOptionEntry, true>): JSX.Element => {
    return (
        <components.ClearIndicator {...props}>
            <UIIcon className="ui-create-select-indicator-clear" iconName="Clear" />
        </components.ClearIndicator>
    );
};

/**
 * Return a custom loading indicator component to be used in the select component.
 *
 * @param {LoadingIndicatorProps<UICreateSelectOptionEntry, true, UICreateSelectGroupEntry>} _props
 * @returns {JSX.Element}
 */
const LoadingIndicator = (
    _props: LoadingIndicatorProps<UICreateSelectOptionEntry, true, UICreateSelectGroupEntry>
): JSX.Element => {
    return (
        <div className="ui-create-select-indicator-loading">
            <UILoader className="uiLoaderXSmall" labelPosition="right" />
        </div>
    );
};

/**
 * Return a custom option component to be used in the select component.
 *
 * @param {OptionProps<UICreateSelectOptionEntry, true, UICreateSelectGroupEntry>} props
 * @returns {JSX.Element}
 */
const Option = (props: OptionProps<UICreateSelectOptionEntry, true, UICreateSelectGroupEntry>): JSX.Element => {
    return (
        <React.Fragment>
            {!props?.data?.__isNew__ && (
                <components.Option {...props}>
                    <UIHighlightMenuOption text={props?.data?.label} query={props?.selectProps?.inputValue} />
                </components.Option>
            )}
            {props?.data?.__isNew__ && <components.Option {...props} />}
        </React.Fragment>
    );
};

const getBackgroundColor = (state: OptionProps<UICreateSelectOptionEntry>): string => {
    let backgroundColor = 'transparent';
    if (state.isSelected) {
        backgroundColor =
            'var(--vscode-editorSuggestWidget-selectedBackground, var(--vscode-quickInputList-focusBackground))';
    }
    if (state.isFocused && !state.isSelected) {
        backgroundColor = 'var(--vscode-list-hoverBackground)';
    }
    return backgroundColor;
};

/**
 * Return a UICreateSelect component.
 *
 * @param {CreatableProps} props to be passed to the component.
 * @returns {JSX.Element}
 */
export const UICreateSelect: FC<UICreateSelectProps> = (props: UICreateSelectProps): JSX.Element => {
    const formatCreateLabel = (inputValue: string) => `${props.createText}: ${inputValue}`;

    return (
        <CreatableSelect
            {...props}
            ref={props.creatableRef}
            className="ui-create-select"
            classNamePrefix="ui-create-select"
            openMenuOnFocus={false}
            createOptionPosition="first"
            allowCreateWhileLoading={true}
            formatOptionLabel={(option) => option.label}
            formatCreateLabel={formatCreateLabel}
            components={{ ClearIndicator, DropdownIndicator, LoadingIndicator, Option }}
            unstyled={true}
            styles={{
                control: (baseStyles, state) => ({
                    ...baseStyles,
                    background: 'var(--vscode-input-background)',
                    height: '26px',
                    maxHeight: '26px',
                    minHeight: '26px',
                    padding: '0px 0px 0px 8px;',
                    boxShadow: 'none',
                    boxSizing: 'border-box',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: state.isFocused ? 'var(--vscode-focusBorder)' : 'var(--vscode-editorWidget-border)',
                    color: 'var(--vscode-input-foreground)',
                    borderRadius: COMMON_INPUT_STYLES.borderRadius,
                    '&:hover': {
                        borderColor: 'var(--vscode-focusBorder)'
                    }
                }),
                input: (baseStyles, _state) => ({
                    ...baseStyles,
                    color: 'var(--vscode-input-foreground)',
                    background: 'transparent',
                    fontFamily: 'var(--vscode-font-family)',
                    fontSize: '13px',
                    fontWeight: 'normal',
                    minHeight: 'unset',
                    padding: '1px 0px 1px 1px',
                    outline: 0
                }),
                menu: (baseStyles, _state) => ({
                    ...baseStyles,
                    background: 'var(--vscode-menu-background, var(--vscode-input-background))',
                    border: '1px solid var(--vscode-focusBorder)',
                    boxSizing: 'border-box',
                    margin: '0px',
                    borderRadius: 0
                }),
                option: (baseStyles, state) => ({
                    ...baseStyles,
                    fontFamily: 'var(--vscode-font-family)',
                    fontWeight: 'var(--vscode-font-weight)',
                    minHeight: '22px',
                    height: '22px',
                    lineHeight: '22px',
                    color: state.isSelected
                        ? 'var(--vscode-editorSuggestWidget-selectedForeground, var(--vscode-quickInputList-focusForeground, var(--vscode-editorSuggestWidget-foreground)))'
                        : 'var(--vscode-editorSuggestWidget-foreground)',
                    backgroundColor: getBackgroundColor(state),
                    letterSpacing: 'normal',
                    border: '0',
                    padding: '0px 8px',
                    fontSize: '13px',
                    '&:hover': {
                        backgroundColor: !state.isSelected
                            ? 'var(--vscode-list-hoverBackground)'
                            : getBackgroundColor(state),
                        color: state.isSelected
                            ? 'var(--vscode-editorSuggestWidget-selectedForeground, var(--vscode-quickInputList-focusForeground, var(--vscode-editorSuggestWidget-foreground)))'
                            : 'var(--vscode-editorSuggestWidget-foreground)',
                        cursor: 'pointer'
                    }
                }),
                placeholder: (baseStyles, _state) => ({
                    ...baseStyles,
                    fontSize: '13px',
                    fontWeight: 'normal',
                    fontFamily: 'var(--vscode-font-family)',
                    color: 'var(--vscode-input-placeholderForeground)'
                }),
                singleValue: (baseStyles, _state) => ({
                    ...baseStyles,
                    color: 'var(--vscode-input-foreground)',
                    background: 'transparent',
                    fontFamily: 'var(--vscode-font-family)',
                    fontSize: '13px',
                    fontWeight: 'normal',
                    minHeight: 'unset',
                    padding: '1px 0px 1px 1px',
                    outline: 0
                }),
                valueContainer: (baseStyles, _state) => ({ ...baseStyles, padding: '0px' }),
                indicatorsContainer: (baseStyles, _state) => ({
                    ...baseStyles,
                    padding: '0px 5px 0px 0px',
                    cursor: 'pointer'
                }),
                indicatorSeparator: (baseStyles, _state) => ({ ...baseStyles, display: 'none' }),
                dropdownIndicator: (baseStyles, _state) => ({ ...baseStyles, padding: '0px' }),
                clearIndicator: (baseStyles, _state) => ({
                    ...baseStyles,
                    padding: '0px',
                    cursor: 'pointer'
                })
            }}
        />
    );
};
