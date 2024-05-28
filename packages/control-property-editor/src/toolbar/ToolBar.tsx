import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import React from 'react';
import { useSelector } from 'react-redux';

import { UIFocusZone, UILabel, UIToolbar, UIToolbarColumn } from '@sap-ux/ui-components';
import type { Scenario } from '@sap-ux-private/control-property-editor-common';

import type { RootState } from '../store';
import { Separator, ThemeSelectorCallout } from '../components';

import { ViewChanger } from './ViewChanger';
import { DeviceSelector } from './DeviceSelector';
import { ModeSwitcher } from './ModeSwitcher';
import { UndoRedoSaveActions } from './UndoRedoSaveActions';

import './ToolBar.scss';

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
        <UIFocusZone>
            <UIToolbar>
                <UIToolbarColumn className="column-left">
                    <UILabel className="app-title">
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
        </UIFocusZone>
    );
}
