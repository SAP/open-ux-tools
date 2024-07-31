import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@fluentui/react';
import { useSelector } from 'react-redux';

import type { QuickAction } from '@sap-ux-private/control-property-editor-common';
import { NESTED_QUICK_ACTION_KIND, SIMPLE_QUICK_ACTION_KIND } from '@sap-ux-private/control-property-editor-common';

import type { RootState } from '../../store';
import { sectionHeaderFontSize } from '../properties/constants';

import { SimpleQuickActionListItem } from './SimpleQuickAction';
import { NestedQuickActionListItem } from './NestedQuickAction';

import './QuickAction.scss';

/**
 * React element for all properties including id & type and property editors.
 *
 * @returns ReactElement
 */
export function QuickActionList(): ReactElement {
    const { t } = useTranslation();
    const quickActions = useSelector<RootState, QuickAction[]>((state) => state.quickActions);
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
                <div className={`quick-action-items`}>
                    {quickActions.map((quickAction) => {
                        if (quickAction.kind === SIMPLE_QUICK_ACTION_KIND) {
                            return <SimpleQuickActionListItem key={quickAction.title} action={quickAction} />;
                        }
                        if (quickAction.kind === NESTED_QUICK_ACTION_KIND) {
                            return <NestedQuickActionListItem key={quickAction.title} action={quickAction} />;
                        }
                        return <></>;
                    })}
                </div>
            </div>
        </>
    );
}
