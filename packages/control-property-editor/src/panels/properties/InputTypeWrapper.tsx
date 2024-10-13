import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { TFunction } from 'i18next';
import { Label, Stack } from '@fluentui/react';

import {
    UIFocusZone,
    UITooltip,
    UITooltipUtils,
    UIDirectionalHint,
    getCalloutStyle,
    UIDialog
} from '@sap-ux/ui-components';

import type { ControlProperty, PropertyChangeDeletionDetails } from '@sap-ux-private/control-property-editor-common';
import {
    CHECKBOX_EDITOR_TYPE,
    deletePropertyChanges,
    DROPDOWN_EDITOR_TYPE,
    INPUT_EDITOR_TYPE,
    INTEGER_VALUE_TYPE,
    STRING_VALUE_TYPE
} from '@sap-ux-private/control-property-editor-common';

import { IconName } from '../../icons';
import { ChangeIndicator } from '../../components/ChangeIndicator';

import type { CacheValue } from './propertyValuesCache';
import type { InputTypeToggleOptionProps, InputTypeWrapperProps } from './types';
import { InputType, isExpression } from './types';
import { PropertyDocumentation } from './PropertyDocumentation';
import { defaultFontSize } from './constants';
import { InputTypeSelector } from './InputTypeSelector';
import { useTranslation } from 'react-i18next';

export const getDefaultInputType = (editor: string, type: string, value: CacheValue): InputType => {
    let defaultInputType: InputType = InputType.expression;
    switch (editor) {
        case DROPDOWN_EDITOR_TYPE:
            defaultInputType = InputType.enumMember;
            break;
        case INPUT_EDITOR_TYPE:
            defaultInputType = type === STRING_VALUE_TYPE ? InputType.string : InputType.number;
            break;
        case CHECKBOX_EDITOR_TYPE:
            if (typeof value === 'boolean') {
                defaultInputType = value ? InputType.booleanTrue : InputType.booleanFalse;
            }
            break;
        default:
    }
    return defaultInputType;
};

/**
 * Gets translated tooltip, if translation function exists.
 *
 * @param value string
 * @param t TFunction
 * @returns string
 */
function getToolTip(value: string, t?: TFunction): string {
    if (t) {
        return t(value);
    } else {
        return value;
    }
}

export const getInputTypeToggleOptions = (property: ControlProperty, t?: TFunction): InputTypeToggleOptionProps[] => {
    const { value, editor, type } = property;
    const inputTypeToggleOptions: InputTypeToggleOptionProps[] = [];
    switch (editor) {
        case CHECKBOX_EDITOR_TYPE:
            inputTypeToggleOptions.push({
                inputType: InputType.booleanTrue,
                tooltip: getToolTip('BOOLEAN_TYPE_TRUE', t),
                iconName: IconName.boolTrue,
                selected: typeof value === 'boolean' && value === true
            });
            inputTypeToggleOptions.push({
                inputType: InputType.booleanFalse,
                tooltip: getToolTip('BOOLEAN_TYPE_FALSE', t),
                iconName: IconName.boolFalse,
                selected: typeof value === 'boolean' && value === false
            });
            break;
        case DROPDOWN_EDITOR_TYPE:
            inputTypeToggleOptions.push({
                inputType: InputType.enumMember,
                tooltip: getToolTip('ENUM_TYPE', t),
                iconName: IconName.dropdown,
                selected: !!property.options.find((option) => option.key === value)
            });
            break;
        case INPUT_EDITOR_TYPE:
            if (type === STRING_VALUE_TYPE) {
                inputTypeToggleOptions.push({
                    inputType: InputType.string,
                    tooltip: getToolTip('STRING_TYPE', t),
                    iconName: IconName.string,
                    selected: typeof value !== 'string' || !isExpression(value)
                });
            } else {
                const textKey = type === INTEGER_VALUE_TYPE ? 'INTEGER_TYPE' : 'FLOAT_TYPE';
                inputTypeToggleOptions.push({
                    inputType: InputType.number,
                    tooltip: getToolTip(textKey, t),
                    iconName: IconName.number,
                    selected: typeof value !== 'string' || !isExpression(value)
                });
            }
            break;
        default:
    }

    inputTypeToggleOptions.push({
        inputType: InputType.expression,
        tooltip: getToolTip('EXPRESSION_TYPE', t),
        iconName: IconName.expression,
        selected: typeof value === 'string' && isExpression(value)
    });

    return inputTypeToggleOptions;
};

/**
 * React element for input type wrapper.
 *
 * @param props InputTypeWrapperProps
 * @returns ReactElement
 */
export function InputTypeWrapper(props: InputTypeWrapperProps): ReactElement {
    const { property, changes } = props;
    const { name, isEnabled, documentation } = property;

    const { t } = useTranslation();
    const dispatch = useDispatch();

    const [dialogState, setDialogState] = useState<PropertyChangeDeletionDetails | undefined>(undefined);
    const documentationContent = documentation && (
        <PropertyDocumentation
            title={property.readableName}
            defaultValue={documentation?.defaultValue}
            description={documentation?.description}
            propertyName={documentation?.propertyName}
            propertyType={documentation?.propertyType}
            onDelete={showDeleteConfirmation}
        />
    );

    /**
     *
     * @param controlId string
     * @param propertyName string
     */
    function showDeleteConfirmation(controlId: string, propertyName: string): void {
        setDialogState({
            controlId,
            propertyName
        });
    }

    function onConfirmDelete(): void {
        if (dialogState) {
            dispatch(deletePropertyChanges(dialogState));
            setDialogState(undefined);
        }
    }

    function onCancelDelete(): void {
        setDialogState(undefined);
    }

    const indicator = changes ? (
        <Stack.Item>
            <ChangeIndicator id={`${name}--ChangeIndicator`} {...changes} type="property" />
        </Stack.Item>
    ) : (
        <></>
    );
    return (
        <UIFocusZone
            isCircularNavigation={true}
            data-testid={`${name}--InputTypeWrapper`}
            style={{
                marginBottom: 10,
                marginTop: 10
            }}>
            <Stack horizontal horizontalAlign="space-between">
                <UITooltip
                    calloutProps={{
                        gapSpace: 5,
                        styles: getCalloutStyle({
                            styles: {
                                root: {
                                    padding: 'none'
                                },
                                calloutMain: {
                                    padding: 'none'
                                }
                            }
                        })
                    }}
                    delay={2}
                    maxWidth={400}
                    directionalHint={UIDirectionalHint.leftCenter}
                    id={`${name}--PropertyTooltip`}
                    tooltipProps={UITooltipUtils.renderContent(documentationContent ?? '')}>
                    <Stack
                        horizontal
                        horizontalAlign="space-between"
                        tokens={{
                            childrenGap: '5px'
                        }}>
                        {indicator}
                        <Stack.Item>
                            <Label
                                data-aria-label={name}
                                data-testid={`${name}--Label`}
                                disabled={!isEnabled}
                                style={{
                                    color: 'var(--vscode-foreground)',
                                    opacity: isEnabled ? 1 : 0.4,
                                    fontSize: defaultFontSize,
                                    fontWeight: 'bold',
                                    padding: 0,
                                    width: '190px',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    overflowX: 'hidden',
                                    marginTop: 2,
                                    marginBottom: 3
                                }}>
                                {property.readableName}
                            </Label>
                        </Stack.Item>
                    </Stack>
                </UITooltip>
                <Stack horizontal horizontalAlign="end">
                    <InputTypeSelector {...props} />
                </Stack>
            </Stack>
            {props.children}
            {dialogState && (
                <UIDialog
                    hidden={dialogState === undefined}
                    onAccept={onConfirmDelete}
                    acceptButtonText={t('CONFIRM_DELETE')}
                    cancelButtonText={t('CANCEL_DELETE')}
                    onCancel={onCancelDelete}
                    dialogContentProps={{
                        title: t('CONFIRM_DELETE_TITLE'),
                        subText: t('CONFIRM_DELETE_SUBTEXT')
                    }}></UIDialog>
            )}
        </UIFocusZone>
    );
}
