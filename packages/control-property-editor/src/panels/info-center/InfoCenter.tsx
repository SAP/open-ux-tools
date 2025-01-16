import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label, Stack, Text } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';
import type { InfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { clearInfoCenterMessage, clearAllInfoCenterMessages, MessageBarType, toggleExpandMessage } from '@sap-ux-private/control-property-editor-common';
import { UIMessageBar, UIIconButton, UiIcons, UIIconButtonSizes } from '@sap-ux/ui-components';
import type { RootState } from '../../store';
import { sectionHeaderFontSize } from '../properties/constants';
import './InfoCenter.scss';

/**
 * React element for info center messages.
 *
 * @returns ReactElement
 */
export function InfoCenter(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const infoCenter = useSelector<RootState, InfoCenterMessage[]>((state) => state.infoCenter);
    const expandedStates = useSelector<RootState, boolean[]> ((state) => state.expandedStates);
    function getMessageType(type: MessageBarType) {
        switch (type) {
            case MessageBarType.error:
                return 'error';
            case MessageBarType.warning:
                return 'warning';
            default:
                return 'info';
        }
    }

    return (
        <>
            <Stack>
                <div className='info-center-header'>
                    <Stack.Item>
                        <Label
                            data-aria-label={t('INFO CENTER')}
                            style={{
                                color: 'var(--vscode-foreground)',
                                fontSize: sectionHeaderFontSize,
                                fontWeight: 'bold',
                                padding: 0
                            }}>
                            {t('INFO CENTER')}
                        </Label>
                    </Stack.Item>
                    <Stack.Item className='dismiss-icon-button-container'>
                        <UIIconButton onClick={() => dispatch(clearAllInfoCenterMessages())} iconProps={{ iconName: UiIcons.TextGrammarDismiss }} sizeType={UIIconButtonSizes.Wide} />
                    </Stack.Item>
                </div>
                <Stack className={`info-center-items`}>
                    {infoCenter.map((info, index) => {
                        const isExpandable = info.message.description.length > 150; // Check if description exceeds 200 chars
                        const isExpanded = expandedStates[index]; // Check the expanded state for this index
                        return (
                            <Stack.Item key={index}>
                                <UIMessageBar messageBarType={info.type as MessageBarType} className={`message-bar ${getMessageType(info.type)}`}>
                                    <Text block={true} className={`message-title`}>{info.message.title}</Text>
                                    <Text block={true} className={`message-description`}>
                                        {isExpanded || !isExpandable
                                            ? info.message.description
                                            : `${info.message.description.slice(0, 150)}...`}
                                    </Text>
                                    {   
                                        isExpandable &&
                                        <UIIconButton
                                            className='icon-button-container-expand'
                                            onClick={() => dispatch(toggleExpandMessage(index))}
                                            iconProps={{ iconName: isExpanded ? UiIcons.ArrowUp : UiIcons.ArrowDown }}
                                        />
                                    }
                                    {
                                        info.type !== MessageBarType.error &&
                                        <UIIconButton
                                            className='icon-button-container'
                                            onClick={() => dispatch(clearInfoCenterMessage(index))}
                                            iconProps={{ iconName: UiIcons.TrashCan }}
                                        />
                                    }
                                </UIMessageBar>
                            </Stack.Item>
                        )
                    })}
                </Stack>
            </Stack>
        </>
    );
}