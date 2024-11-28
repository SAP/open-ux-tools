import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label, Stack, Text } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';
import type { InfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { clearInfoCenterMessage, clearAllInfoCenterMessages, MessageBarType } from '@sap-ux-private/control-property-editor-common';
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
                    {infoCenter.map((info, index) => (
                        <Stack.Item>
                            <UIMessageBar key={index} messageBarType={info.type as MessageBarType} className={`message-bar ${getMessageType(info.type)}`}>
                                    <Text block={true} className={`message-title`}>{info.message.title}</Text>
                                    <Text block={true} className={`message-description`}>{info.message.description}</Text>
                                    
                                {
                                    info.type !== MessageBarType.error &&
                                    <UIIconButton
                                        className='icon-button-container'
                                        onClick={() => dispatch(clearInfoCenterMessage(index))}
                                        iconProps={{ iconName: UiIcons.Clear }}
                                    />
                                }
                            </UIMessageBar>
                        </Stack.Item>
                    ))}
                </Stack>
            </Stack>
        </>
    );
}