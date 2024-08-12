import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label, Stack } from '@fluentui/react';
import { useSelector } from 'react-redux';

import type { QuickActionGroup } from '@sap-ux-private/control-property-editor-common';
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
    const groups = useSelector<RootState, QuickActionGroup[]>((state) => state.quickActions);
    console.log(groups);

    return (
        <div className={`property-content app-panel-scroller`}>
            <Stack>
                {groups.flatMap((group) => {
                    const groupTitle = t('QUICK_ACTIONS', { title: group.title });
                    return [
                        <Label
                            data-aria-label={groupTitle}
                            key={group.title}
                            style={{
                                color: 'var(--vscode-foreground)',
                                fontSize: sectionHeaderFontSize,
                                fontWeight: 'bold',
                                padding: 0,
                                marginBottom: '10px'
                            }}>
                            {groupTitle}
                        </Label>,

                        ...group.actions.map((quickAction, idx) => {
                            if (quickAction.kind === SIMPLE_QUICK_ACTION_KIND) {
                                return (
                                    <Stack.Item key={`${quickAction.id}`}>
                                        <SimpleQuickActionListItem key={quickAction.id} action={quickAction} />
                                    </Stack.Item>
                                );
                            }
                            if (quickAction.kind === NESTED_QUICK_ACTION_KIND) {
                                return (
                                    <Stack.Item key={`${quickAction.id}`}>
                                        <NestedQuickActionListItem
                                            key={quickAction.id}
                                            action={quickAction}
                                            actionIdx={idx}
                                        />
                                    </Stack.Item>
                                );
                            }
                            return <></>;
                        })
                    ];
                })}
            </Stack>
        </div>
    );
}
