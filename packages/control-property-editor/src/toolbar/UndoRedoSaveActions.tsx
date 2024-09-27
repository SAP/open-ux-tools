import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { redo, reloadApplication, save, undo } from '@sap-ux-private/control-property-editor-common';
import { UIIconButton, UiIcons } from '@sap-ux/ui-components';

import type { ChangesSlice } from '../slice';
import type { RootState } from '../store';
import { Separator } from '../components';
import { IconName } from '../icons';

/**
 * React element for Undo, Redo and Save.
 *
 * @returns ReactElement
 */
export function UndoRedoSaveActions(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const changeStack = useSelector<RootState, { canRedo: boolean; canUndo: boolean }>((state) => state.changeStack);
    const canSave = useSelector<RootState, boolean>((state) => state.canSave);
    const isLoading = useSelector<RootState, boolean>((state) => state.isAppLoading);
    const fileChanges = useSelector<RootState, string[] | undefined>((state) => state.fileChanges) ?? [];
    const applicationRequiresReload = useSelector<RootState, boolean>((state) => state.applicationRequiresReload);
    const { pending } = useSelector<RootState, ChangesSlice>((state) => state.changes);
    const saveAndReload = (fileChanges.length > 0 && pending.length > 0) || applicationRequiresReload;
    return (
        <>
            <UIIconButton
                id="undo-button"
                iconProps={{
                    iconName: UiIcons.Undo
                }}
                title={t('UNDO')}
                onClick={(): void => {
                    dispatch(undo());
                }}
                disabled={!changeStack.canUndo || isLoading}
            />
            <UIIconButton
                id="redo-button"
                iconProps={{
                    iconName: UiIcons.Redo
                }}
                title={t('REDO')}
                onClick={(): void => {
                    dispatch(redo());
                }}
                disabled={!changeStack.canRedo || isLoading}
            />
            <Separator direction="vertical" style={{ marginLeft: '10px', marginRight: '10px' }} />
            {saveAndReload ? (
                <UIIconButton
                    id="save-button"
                    iconProps={{
                        iconName: IconName.saveAndReload
                    }}
                    title={t('SAVE_AND_RELOAD')}
                    onClick={(): void => {
                        dispatch(reloadApplication({ save: true }));
                    }}
                    disabled={!canSave || isLoading}
                />
            ) : (
                <UIIconButton
                    id="save-button"
                    iconProps={{
                        iconName: UiIcons.Save
                    }}
                    title={t('SAVE')}
                    onClick={(): void => {
                        dispatch(save());
                    }}
                    disabled={!canSave || isLoading}
                />
            )}
        </>
    );
}
