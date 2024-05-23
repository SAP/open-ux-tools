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
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Scenario } from '@sap-ux-private/control-property-editor-common';

export interface ToolbarProps {
    left?: React.ReactNode;
    right?: React.ReactNode;
}
/**
 * React element with children.
 *
 * @returns ReactElement
 */
export function Toolbar(): ReactElement {
    const { t } = useTranslation();
    const scenario = useSelector<RootState, Scenario>((state) => state.scenario);
    return (
        <UIToolbar>
            <UIToolbarColumn className="column-left">
                <UILabel className="flexEditorLabel">
                    {scenario === 'ADAPTATION_PROJECT' ? t('APP_TITLE_ADAPTATION_EDITOR') : t('APP_TITLE')}
                </UILabel>
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
