import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';

import { UILink } from '@sap-ux/ui-components';
import { executeQuickAction, type QuickAction } from '@sap-ux-private/control-property-editor-common';

import type { RootState } from '../../store';
import { sectionHeaderFontSize } from '../properties/constants';

/**
 * React element for all properties including id & type and property editors.
 *
 * @returns ReactElement
 */
export function QuickActionList(): ReactElement {
    const { t } = useTranslation();
    const quickActions = useSelector<RootState, QuickAction[]>((state) => state.quickActions);
    const dispatch = useDispatch();
    console.log(quickActions);

    return (
        <>
            <div className={`property-content app-panel-scroller`}>
                <Label
                    data-aria-label={t('QUICK_ACTIONS')}
                    style={{
                        color: 'var(--vscode-foreground)',
                        fontSize: sectionHeaderFontSize,
                        fontWeight: 'bold',
                        padding: 0,
                        marginBottom: '10px'
                    }}>
                    {t('QUICK_ACTIONS')}
                </Label>
                {quickActions.map((quickAction) => (
                    <UILink key={quickAction.type} onClick={() => dispatch(executeQuickAction(quickAction))}>
                        {quickAction.title}
                    </UILink>
                ))}
            </div>
        </>
    );
}
