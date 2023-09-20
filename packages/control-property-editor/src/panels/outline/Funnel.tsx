import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UICheckbox, UIIconButton, UICallout, UICalloutContentPadding } from '@sap-ux/ui-components';
import { useDispatch, useSelector } from 'react-redux';
import { IconName } from '../../icons';
import type { FilterOptions } from '../../slice';
import { FilterName, filterNodes } from '../../slice';
import type { RootState } from '../../store';

const TARGET = 'control-property-editor-funnel-callout-target-id';

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
    const focusChecked = filterQuery.filter((item) => item.name === FilterName.focusEditable)[0].value as boolean;
    const focusCommonlyUsedChecked = filterQuery.filter((item) => item.name === FilterName.focusCommonlyUsed)[0]
        .value as boolean;
    const checked = focusChecked || focusCommonlyUsedChecked;
    return (
        <>
            <UIIconButton
                id={TARGET}
                className={`funnel-icon`}
                iconProps={{ iconName: IconName.funnel }}
                checked={checked}
                onClick={showCallout}></UIIconButton>
            {isVisible && (
                <UICallout
                    target={`#${TARGET}`}
                    isBeakVisible={true}
                    beakWidth={5}
                    directionalHint={4}
                    onDismiss={() => setIsVisible(false)}
                    contentPadding={UICalloutContentPadding.Standard}>
                    <UICheckbox
                        className={'funnel-call-out-checkbox'}
                        label={t('FOCUS_EDITABLE')}
                        checked={focusChecked}
                        onChange={(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, isChecked?: boolean) => {
                            onChange(FilterName.focusEditable, isChecked);
                        }}></UICheckbox>
                    <UICheckbox
                        label={t('FOCUS_COMMONLY_USED')}
                        checked={focusCommonlyUsedChecked}
                        onChange={(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, isChecked?: boolean) => {
                            onChange(FilterName.focusCommonlyUsed, isChecked);
                        }}></UICheckbox>
                </UICallout>
            )}
        </>
    );
};

export { Funnel };
