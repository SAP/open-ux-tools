import { UIDefaultButton, UIIconButton, UILabel, UiIcons } from '@sap-ux/ui-components';
import { ReactElement, useEffect } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { appMode, rtaEvent } from '@sap-ux-private/control-property-editor-common';
import type { RootState } from '../store';
import { ChangesSlice } from '../slice';

export function RTAToolBar(props: any): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const mode = useSelector<RootState, 'navigation' | 'adaptation'>((state) => state.appMode);
    const rtaEventState = useSelector<RootState, { redo: boolean; undo: boolean; save: boolean }>(
        (state) => state.rtaEventState
    );
    return (
        <>
            <UIDefaultButton
                primary={mode === 'adaptation'}
                onClick={(): void => {
                    dispatch(appMode('adaptation'));
                }}>
                Edit
            </UIDefaultButton>
            <UIDefaultButton
                primary={mode === 'navigation'}
                onClick={(): void => {
                    dispatch(appMode('navigation'));
                }}>
                Navigate
            </UIDefaultButton>
            <UIIconButton
                iconProps={{
                    iconName: UiIcons.Undo
                }}
                title={t('UNDO')}
                onClick={(): void => {
                    dispatch(rtaEvent('undo'));
                }}
                disabled={!rtaEventState.undo}
            />
            <UIIconButton
                iconProps={{
                    iconName: UiIcons.Redo
                }}
                title={t('REDO')}
                onClick={(): void => {
                    dispatch(rtaEvent('redo'));
                }}
                disabled={!rtaEventState.redo}
            />
            <UIIconButton
                iconProps={{
                    iconName: UiIcons.Save
                }}
                title={t('SAVE')}
                onClick={(): void => {
                    dispatch(rtaEvent('save'));
                }}
                disabled={!rtaEventState.save}
            />
        </>
    );
}
