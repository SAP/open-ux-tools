import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UICheckbox, UIIconButton, UICallout, UICalloutContentPadding } from '@sap-ux/ui-components';
import { useDispatch, useSelector } from 'react-redux';
import { IconName } from '../../icons';
import type { FilterOptions } from '../../slice';
import { FilterName, filterNodes } from '../../slice';
import type { RootState } from '../../store';
import './Properties.scss';

const TARGET = 'control-property-editor-property-search-funnel-callout-target-id';

const Funnel = (): ReactElement => {
    const { t } = useTranslation();
    const filterQuery = useSelector<RootState, FilterOptions[]>((state) => state.filterQuery);
    const dispatch = useDispatch();
    const [isVisible, setIsVisible] = useState(false);
    const showCallout = () => {
        setIsVisible(true);
    };
    const onChange = (name: FilterName, isChecked = false) => {
        const action = filterNodes([{ name, value: isChecked }]);
        dispatch(action);
    };
    const showEditablePropertiesChecked = filterQuery.filter(
        (item) => item.name === FilterName.showEditableProperties
    )[0].value as boolean;
    const checked = showEditablePropertiesChecked;
    return (
        <>
            <UIIconButton
                id={TARGET}
                className={`funnel-properties-icon`}
                iconProps={{ iconName: IconName.funnel }}
                checked={checked}
                title={checked ? t('MANAGE_FILTER_ICON_TOOLTIP') : t('FILTER_ICON_TOOLTIP')}
                onClick={showCallout}></UIIconButton>
            {isVisible && (
                <UICallout
                    styles={{ calloutMain: { minWidth: 196, minHeight: 35 } }}
                    target={`#${TARGET}`}
                    isBeakVisible={true}
                    gapSpace={5}
                    beakWidth={5}
                    directionalHint={4}
                    onDismiss={() => setIsVisible(false)}
                    contentPadding={UICalloutContentPadding.Standard}>
                    <UICheckbox
                        id={'editable-properties-checkbox'}
                        label={t('SHOW_EDITABLE_PROPERTIES')}
                        checked={showEditablePropertiesChecked}
                        onChange={(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, isChecked?: boolean) => {
                            onChange(FilterName.showEditableProperties, isChecked);
                        }}></UICheckbox>
                </UICallout>
            )}
        </>
    );
};

export { Funnel };
