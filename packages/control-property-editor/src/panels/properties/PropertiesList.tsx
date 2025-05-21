import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Control } from '@sap-ux-private/control-property-editor-common';
import {
    CHECKBOX_EDITOR_TYPE,
    DROPDOWN_EDITOR_TYPE,
    INPUT_EDITOR_TYPE
} from '@sap-ux-private/control-property-editor-common';
import { Separator } from '../../components/Separator';
import type { RootState } from '../../store';
import { DropdownEditor } from './DropdownEditor';
import { HeaderField } from './HeaderField';
import { getDefaultInputType, getInputTypeToggleOptions, InputTypeWrapper } from './InputTypeWrapper';
import { setCachedValue } from './propertyValuesCache';
import { StringEditor } from './StringEditor';
import type { InputTypeWrapperProps } from './types';
import { isExpression } from './types';
import { sectionHeaderFontSize } from './constants';
import { useSelector } from 'react-redux';
import { UISearchBox } from '@sap-ux/ui-components';
import { NoControlSelected } from './NoControlSelected';
import { Label } from '@fluentui/react';
import './Properties.scss';
import { Funnel } from './Funnel';
import type { ControlChangeStats, FilterOptions } from '../../slice';
import { FilterName } from '../../slice';

/**
 * React element for all properties including id & type and property editors.
 *
 * @returns ReactElement
 */
export function PropertiesList(): ReactElement {
    const { t } = useTranslation();
    const control = useSelector<RootState, Control | undefined>((state) => state.selectedControl);
    const controlChanges = useSelector<RootState, ControlChangeStats | undefined>(
        (state) => state.changes.controls[control?.id ?? '']
    );
    const isEditableOnly = useSelector<RootState, FilterOptions[]>((state) => state.filterQuery).filter(
        (item) => item.name === FilterName.showEditableProperties
    )[0].value as boolean;
    const [filterValue, setFilterValue] = useState('');
    if (!control) {
        // Nothing selected, show message
        return <NoControlSelected />;
    }
    const { id, type, properties, name } = control;
    const onFilterChange = (
        event?: React.ChangeEvent<HTMLInputElement> | undefined,
        filterValue?: string | undefined
    ): void => {
        setFilterValue(filterValue?.toLowerCase() ?? '');
    };
    const editors = (
        <>
            {properties
                .filter(
                    (property) =>
                        !filterValue ||
                        property.name.toLowerCase().includes(filterValue) ||
                        property.readableName.toLowerCase().includes(filterValue)
                )
                .filter((property) => (isEditableOnly && property.isEnabled) || !isEditableOnly)
                .map((property) => {
                    const props: InputTypeWrapperProps = {
                        controlId: id,
                        controlName: name,
                        property,
                        toggleOptions: getInputTypeToggleOptions(property, t),
                        changes: controlChanges?.properties[property.name]
                    };
                    const defaultInputType = getDefaultInputType(property.editor, property.type, property.value);
                    setCachedValue(id, property.name, defaultInputType, property.value);
                    let result: ReactElement | undefined;
                    switch (property.editor) {
                        case CHECKBOX_EDITOR_TYPE:
                            if (typeof property.value !== 'boolean') {
                                result = <StringEditor {...props} />;
                            }
                            break;
                        case DROPDOWN_EDITOR_TYPE:
                            if (isExpression(property.value)) {
                                result = <StringEditor {...props} />;
                            } else {
                                result = (
                                    <DropdownEditor
                                        {...{
                                            key: property.name,
                                            controlId: id,
                                            property,
                                            controlName: name
                                        }}
                                    />
                                );
                            }
                            break;
                        case INPUT_EDITOR_TYPE:
                            result = <StringEditor {...props} />;
                            break;
                        default: {
                            console.warn(
                                `No property editor for '${JSON.stringify(property)}' found. Fallback to string editor`
                            );
                            result = <StringEditor {...props} />;
                            break;
                        }
                    }
                    return (
                        <InputTypeWrapper key={property.name} {...props}>
                            {result}
                        </InputTypeWrapper>
                    );
                })}
        </>
    );
    return (
        <>
            <div className="property-content">
                <HeaderField label={t('CONTROL_ID_LABEL')} value={id} />
                <HeaderField label={t('CONTROL_TYPE_LABEL')} value={type} />
            </div>
            <Separator
                style={{
                    marginTop: '0px',
                    marginBottom: '15px'
                }}
            />
            <div className="filter-properties">
                <UISearchBox
                    id="SearchProperties"
                    autoFocus={false}
                    disableAnimation={false}
                    placeholder={t('SEARCH_PROPERTIES')}
                    onChange={onFilterChange}
                />
                <Funnel />
            </div>
            <div className={`property-content app-panel-scroller`}>
                <Label
                    data-aria-label={t('PROPERTIES')}
                    style={{
                        color: 'var(--vscode-foreground)',
                        fontSize: sectionHeaderFontSize,
                        fontWeight: 'bold',
                        padding: 0,
                        marginBottom: '10px'
                    }}>
                    {t('PROPERTIES')}
                </Label>
                {editors}
            </div>
        </>
    );
}
