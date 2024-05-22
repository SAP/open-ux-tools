import type { ReactElement } from 'react';
import React from 'react';

import { UILabel, UIToolbar, UIToolbarColumn } from '@sap-ux/ui-components';

import './ToolBar.scss';
import { ViewChanger } from '../panels/properties/ViewChanger';
import { DeviceSelector } from '../panels/properties/DeviceSelector';
import { ThemeSelectorCallout } from './ThemeSelectorCallout';
import { Separator } from './Separator';
import { ModeSwitcher } from './ModeSwitcher';
import { UndoRedoSaveActions } from './UndoRedoSaveActions';
import { useTranslation } from 'react-i18next';

export interface ToolbarProps {
    left?: React.ReactNode;
    right?: React.ReactNode;
}
/**
 * React element with children.
 *
 * @param propsWithChildren PropsWithChildren<ToolbarProps>
 * @returns ReactElement
 */
export function Toolbar(): ReactElement {
    const { t } = useTranslation();
    return (
        <UIToolbar>
            <UIToolbarColumn className="column-left">
                <UILabel className="flexEditorLabel">{t('APP_TITLE')}</UILabel>
            </UIToolbarColumn>
            <UIToolbarColumn className="column-center">
                <ModeSwitcher />
                <UndoRedoSaveActions />
            </UIToolbarColumn>
            <UIToolbarColumn className="column-right right-panel-toolbar">
                <div className="rt-panel-tb-left-container">
                    <ThemeSelectorCallout />
                    <Separator direction="vertical" style={{ marginLeft: '10px', marginRight: '10px' }} />
                    <ViewChanger />
                </div>
                <div className="rt-panel-tb-right-container">
                    <DeviceSelector />
                </div>
            </UIToolbarColumn>
        </UIToolbar>
    );
}
