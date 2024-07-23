import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { UICallout, UIDirectionalHint, UIFocusZone, UIIcon, UIIconButton, UILink, UiIcons } from '@sap-ux/ui-components';
import { executeQuickAction, type QuickAction } from '@sap-ux-private/control-property-editor-common';

import type { RootState } from '../../store';

/**
 * React element for all properties including id & type and property editors.
 *
 * @returns ReactElement
 */
export function QuickActionListItem(quickAction: Readonly<QuickAction>): ReactElement {
    const { t } = useTranslation();
    const quickActions = useSelector<RootState, QuickAction[]>((state) => state.quickActions);
    const [isCalloutVisible, setValue] = useState(false);
    const dispatch = useDispatch();
    console.log(quickActions);
    function getChildren() {
        return quickAction.children?.map((child, index) => (
            <UILink key={index} onClick={() => dispatch(executeQuickAction({ ...quickAction, index }))}>
                {child}
            </UILink>
        ));
    }
    return (
        <>
            <div className={`quick-action-item`}>
                <UILink
                    key={quickAction.type}
                    onClick={() => {
                        if ((quickAction.children || [])?.length > 1) {
                            setValue(!isCalloutVisible);
                        } else {
                            dispatch(executeQuickAction(quickAction));

                        }
                    }}>
                    {quickAction.title}
                </UILink>
                {(quickAction.children || [])?.length > 1 && (
                    <UIIconButton
                        id={`quick-action-children-button`}
                        className={`icon-down`}
                        iconProps={{
                            iconName: UiIcons.ChevronDown
                        }}
                        // iconName={UiIcons.ChevronDown}
                        title={t('LIST')}
                        onClick={(): void => {
                            setValue(!isCalloutVisible);
                        }}
                    />
                )}
                {isCalloutVisible && (
                    <UICallout
                        id={'action-selector'}
                        data-testid={'action-selector-callout'}
                        role="alertdialog"
                        alignTargetEdge
                        target={`#${`quick-action-children-button`}`}
                        finalHeight={45}
                        isBeakVisible={true}
                        beakWidth={5}
                        directionalHint={UIDirectionalHint.bottomCenter}
                        styles={{
                            calloutMain: {
                                minWidth: 100
                            }
                        }}
                        setInitialFocus={true}
                        // focusTargetSiblingOnTabPress={true}
                        onDismiss={(): void => {
                            setValue(false);
                        }}>
                        {/* <UIFocusZone
                                        {...themes.map(createThemeButton)}
                             </UIFocusZone> */}
                        <div className={'action-callout-children'}>{getChildren()}</div>
                    </UICallout>
                )}
            </div>
        </>
    );
}
