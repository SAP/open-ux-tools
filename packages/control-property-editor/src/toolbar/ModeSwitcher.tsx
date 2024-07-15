import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { setAppMode } from '@sap-ux-private/control-property-editor-common';
import { UIDefaultButton, UILabel } from '@sap-ux/ui-components';

import type { RootState } from '../store';

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
    const disabled = useSelector<RootState, boolean>((state) => state.isAppLoading);
    const isAdpProject = useSelector<RootState, boolean>((state) => state.isAdpProject);

    const handleAdaptationClick = useCallback(() => {
        dispatch(setAppMode('adaptation'));
    }, [dispatch]);

    const handleNavigationClick = useCallback(() => {
        dispatch(setAppMode('navigation'));
    }, [dispatch]);

    return (
        <div className="mode-switcher">
            <UILabel>{t('MODE')}:</UILabel>
            <UIDefaultButton
                transparent={true}
                checked={mode === 'adaptation'}
                onClick={handleAdaptationClick}
                disabled={disabled}>
                {isAdpProject ? t('UI_ADAPTATION') : t('EDIT')}
            </UIDefaultButton>
            <UIDefaultButton
                transparent={true}
                checked={mode === 'navigation'}
                onClick={handleNavigationClick}
                disabled={disabled}>
                {isAdpProject ? t('NAVIGATION') : t('LIVE')}
            </UIDefaultButton>
        </div>
    );
}
