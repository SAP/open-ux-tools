import { redo, save, undo } from '@sap-ux-private/control-property-editor-common';
import { UIIconButton, UiIcons } from '@sap-ux/ui-components';
import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { Separator } from './Separator';

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
                disabled={!changeStack.canUndo}
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
                disabled={!changeStack.canRedo}
            />
            <Separator direction="vertical" style={{ marginLeft: '10px', marginRight: '10px' }} />
            <UIIconButton
                id="save-button"
                iconProps={{
                    iconName: UiIcons.Save
                }}
                title={t('SAVE')}
                onClick={(): void => {
                    dispatch(save());
                }}
                disabled={!canSave}
            />
        </>
    );
}
