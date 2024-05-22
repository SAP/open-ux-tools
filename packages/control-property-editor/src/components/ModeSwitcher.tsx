import { setAppMode } from '@sap-ux-private/control-property-editor-common';
import { UIDefaultButton, UILabel } from '@sap-ux/ui-components';
import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import './ModeSwitcher.scss';

/**
 * React element for ModeSwitch.
 *
 * @returns ReactElement
 */
export function ModeSwitcher(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const mode = useSelector<RootState, 'navigation' | 'adaptation'>((state) => state.appMode);
    return (
        <div className="mode-switcher">
            <UILabel>{t('MODE')}:</UILabel>
            <UIDefaultButton
                primary={mode === 'adaptation'}
                onClick={(): void => {
                    dispatch(setAppMode('adaptation'));
                }}>
                {t('EDIT')}
            </UIDefaultButton>
            <UIDefaultButton
                primary={mode === 'navigation'}
                onClick={(): void => {
                    dispatch(setAppMode('navigation'));
                }}>
                {t('LIVE')}
            </UIDefaultButton>
        </div>
    );
}
